import { useState, useCallback, useEffect, useMemo } from "react";
import type { Memo } from "@/src/types/memo";
import {
  useCreateMemo,
  useUpdateMemo,
  useDeleteMemo,
} from "@/src/hooks/use-memos";
import {
  useAddItemToBoard,
  useRemoveItemFromBoard,
} from "@/src/hooks/use-boards";
import { useQueryClient } from "@tanstack/react-query";
import { OriginalIdUtils } from "@/src/types/common";

interface UseSimpleMemoSaveOptions {
  memo?: Memo | null;
  onSaveComplete?: (
    savedMemo: Memo,
    wasEmpty: boolean,
    isNewMemo: boolean,
  ) => void;
  currentBoardIds?: number[];
  initialBoardId?: number;
  onDeleteAndSelectNext?: (deletedMemo: Memo) => void;
  // チーム機能
  teamMode?: boolean;
  teamId?: number;
}

export function useSimpleMemoSave({
  memo = null,
  onSaveComplete,
  currentBoardIds = [],
  initialBoardId,
  onDeleteAndSelectNext,
  teamMode = false,
  teamId,
}: UseSimpleMemoSaveOptions = {}) {
  const [title, setTitle] = useState(() => memo?.title || "");
  const [content, setContent] = useState(() => memo?.content || "");
  const [selectedBoardIds, setSelectedBoardIds] =
    useState<number[]>(currentBoardIds);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showBoardChangeModal, setShowBoardChangeModal] = useState(false);
  const [pendingBoardChanges, setPendingBoardChanges] = useState<{
    boardsToAdd: number[];
    boardsToRemove: number[];
  }>({ boardsToAdd: [], boardsToRemove: [] });
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [isMemoTransition, setIsMemoTransition] = useState(false);

  // メモが変更されたらボード選択をリセット
  const currentBoardIdsStr = JSON.stringify([...currentBoardIds].sort());
  useEffect(() => {
    setIsMemoTransition(true); // メモ切り替え開始
    setSelectedBoardIds([...currentBoardIds]);
    setIsInitialSync(true); // 初期同期開始
    // 少し遅延させて初期同期完了をマーク
    const timer = setTimeout(() => {
      setIsInitialSync(false);
      setIsMemoTransition(false); // メモ切り替え完了
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memo?.id, currentBoardIdsStr]); // 文字列で比較

  // 変更検知用の初期値
  const [initialTitle, setInitialTitle] = useState(() => memo?.title || "");
  const [initialContent, setInitialContent] = useState(
    () => memo?.content || "",
  );

  const createNote = useCreateMemo({ teamMode, teamId });
  const updateNote = useUpdateMemo({ teamMode, teamId });
  const deleteNote = useDeleteMemo({ teamMode, teamId });
  const addItemToBoard = useAddItemToBoard({ teamMode, teamId });
  const removeItemFromBoard = useRemoveItemFromBoard();
  const queryClient = useQueryClient();

  // 変更検知（ボード選択も含める）
  const hasChanges = useMemo(() => {
    // メモ切り替え中は変更検知を無効化
    if (isMemoTransition) {
      return false;
    }

    const currentTitle = title.trim();
    const currentContent = content.trim();
    const textChanged =
      currentTitle !== initialTitle.trim() ||
      currentContent !== initialContent.trim();

    // 初期同期中はボード変更を無視
    if (isInitialSync) {
      return textChanged;
    }

    const hasBoardChanges =
      JSON.stringify([...selectedBoardIds].sort()) !==
      JSON.stringify([...currentBoardIds].sort());
    return textChanged || hasBoardChanges;
  }, [
    title,
    content,
    initialTitle,
    initialContent,
    selectedBoardIds,
    currentBoardIds,
    isInitialSync,
    isMemoTransition,
  ]);

  // メモが変更された時の初期値更新
  useEffect(() => {
    setIsMemoTransition(true); // データ更新開始

    if (memo) {
      const memoTitle = memo.title || "";
      const memoContent = memo.content || "";
      setTitle(memoTitle);
      setContent(memoContent);
      setInitialTitle(memoTitle);
      setInitialContent(memoContent);
    } else {
      setTitle("");
      setContent("");
      setInitialTitle("");
      setInitialContent("");
    }

    // データ更新完了を少し遅延させてマーク
    const timer = setTimeout(() => {
      setIsMemoTransition(false);
    }, 50);

    return () => clearTimeout(timer);
  }, [memo]);

  const executeSave = useCallback(async () => {
    const isEmpty = !title.trim() && !content.trim();

    if (isSaving) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      if (memo?.id) {
        // 既存メモ更新
        if (isEmpty) {
          // 空メモの場合は削除
          await deleteNote.mutateAsync(memo.id);
          onSaveComplete?.(memo, true, false);
        } else {
          // メモ内容の変更があるかチェック（ボード変更は除く）
          const hasContentChanges =
            (title.trim() || "無題") !== initialTitle.trim() ||
            content.trim() !== initialContent.trim();

          let updatedMemo = memo;

          // メモ内容に変更がある場合のみ更新
          if (hasContentChanges) {
            await updateNote.mutateAsync({
              id: memo.id,
              data: {
                title: title.trim() || "無題",
                content: content.trim() || undefined,
              },
            });

            updatedMemo = {
              ...memo,
              title: title.trim() || "無題",
              content: content.trim() || "",
              updatedAt: Math.floor(Date.now() / 1000),
            };
          } else {
            // 内容に変更がない場合は現在の値を維持
            updatedMemo = {
              ...memo,
              title: title.trim() || "無題",
              content: content.trim() || "",
            };
          }

          // ボード変更の差分を計算して処理
          if (memo.id) {
            // 追加するボード
            const boardsToAdd = selectedBoardIds.filter(
              (id) => !currentBoardIds.includes(id),
            );
            // 削除するボード
            const boardsToRemove = currentBoardIds.filter(
              (id) => !selectedBoardIds.includes(id),
            );

            // デバッグログ: ボード変更処理
            console.log("🔧 [メモ保存] ボード変更処理:", {
              memoId: memo.id,
              originalId: memo.originalId,
              currentBoardIds,
              selectedBoardIds,
              boardsToAdd,
              boardsToRemove,
              teamMode,
              teamId,
            });

            const promises = [];

            // ボード追加
            if (boardsToAdd.length > 0 && memo.id > 0) {
              console.log("🔧 [メモ保存] ボード追加開始:", {
                boardsToAdd,
                memoId: memo.id,
              });

              const addPromises = boardsToAdd.map(async (boardId) => {
                try {
                  console.log("🔗 [メモ保存] ボードへの追加実行:", {
                    boardId,
                    itemId: OriginalIdUtils.fromItem(memo),
                  });

                  await addItemToBoard.mutateAsync({
                    boardId,
                    data: {
                      itemType: "memo",
                      itemId:
                        OriginalIdUtils.fromItem(memo) || memo.id.toString(),
                    },
                  });

                  console.log("✅ [メモ保存] ボード追加成功:", { boardId });
                } catch (error: unknown) {
                  const errorMessage =
                    error instanceof Error ? error.message : String(error);
                  console.error("❌ [メモ保存] ボード追加エラー:", {
                    boardId,
                    error: errorMessage,
                  });

                  // すでに存在する場合はエラーを無視
                  if (!errorMessage.includes("already exists")) {
                    // エラーは既に上位でハンドリングされる
                  }
                }
              });
              promises.push(...addPromises);
            }

            // ボード削除
            if (boardsToRemove.length > 0) {
              const removePromises = boardsToRemove.map(async (boardId) => {
                try {
                  await removeItemFromBoard.mutateAsync({
                    boardId,
                    itemId:
                      OriginalIdUtils.fromItem(memo) || memo.id.toString(),
                    itemType: "memo",
                    teamId,
                  });
                } catch (error: unknown) {
                  console.error(
                    `Failed to remove memo from board ${boardId}:`,
                    error,
                  );
                }
              });
              promises.push(...removePromises);
            }

            if (promises.length > 0) {
              await Promise.all(promises);

              console.log("🔄 [メモ保存] キャッシュ無効化開始:", {
                memoId: memo.id,
                originalId: memo.originalId,
                boardsToAdd,
                boardsToRemove,
              });

              // ボード変更後にキャッシュを無効化
              if (teamMode && teamId) {
                // チームモード用のキャッシュ無効化
                queryClient.invalidateQueries({
                  queryKey: [
                    "team-item-boards",
                    teamId,
                    "memo",
                    memo.originalId,
                  ],
                });
              } else {
                // 個人モード用のキャッシュ無効化
                queryClient.invalidateQueries({
                  queryKey: ["item-boards", "memo", memo.originalId],
                });
              }

              // 全ボードアイテムキャッシュも無効化（表示更新のため）
              queryClient.invalidateQueries({
                queryKey: ["boards", "all-items"],
              });

              // チームモードの場合、チーム関連のキャッシュも無効化
              if (teamMode && teamId) {
                queryClient.invalidateQueries({
                  queryKey: ["team-boards", teamId],
                });
              }

              console.log("✅ [メモ保存] キャッシュ無効化完了");
            }

            // 現在のボードから外された場合は次のアイテムを選択
            if (
              initialBoardId &&
              boardsToRemove.includes(initialBoardId) &&
              onDeleteAndSelectNext
            ) {
              onDeleteAndSelectNext(updatedMemo);
              return;
            }
          }

          onSaveComplete?.(updatedMemo, false, false);
        }
      } else {
        // 新規メモ作成（空の場合は何もしない）
        if (!isEmpty) {
          console.log(
            `🎯 新規メモ作成開始: title="${title}", selectedBoardIds=[${selectedBoardIds.join(",")}], initialBoardId=${initialBoardId}`,
          );
          const createdMemo = await createNote.mutateAsync({
            title: title.trim() || "無題",
            content: content.trim() || undefined,
          });
          console.log(
            `✅ 新規メモ作成完了: id=${createdMemo.id}, originalId=${createdMemo.originalId}`,
          );

          // ボード選択時はボードに追加
          if (selectedBoardIds.length > 0 && createdMemo.id) {
            console.log(
              `📌 ボード追加処理開始: selectedBoardIds=[${selectedBoardIds.join(",")}], memo.id=${createdMemo.id}`,
            );
            // 各ボードに追加（エラーは個別にキャッチ）
            const addPromises = selectedBoardIds.map(async (boardId) => {
              try {
                console.log(
                  `🔗 ボードへの追加実行: boardId=${boardId}, itemId=${OriginalIdUtils.fromItem(createdMemo)}`,
                );
                await addItemToBoard.mutateAsync({
                  boardId,
                  data: {
                    itemType: "memo",
                    itemId:
                      OriginalIdUtils.fromItem(createdMemo) ||
                      createdMemo.id.toString(),
                  },
                });
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
                console.log(
                  `❌ ボードへの追加エラー: boardId=${boardId}, error=${errorMessage}`,
                );
                // すでに存在する場合はエラーを無視
                if (!errorMessage.includes("already exists")) {
                  // エラーは既に上位でハンドリングされる
                }
              }
            });

            await Promise.all(addPromises);

            // ボード追加後にキャッシュを無効化
            if (teamMode && teamId) {
              // チームモード用のキャッシュ無効化
              queryClient.invalidateQueries({
                queryKey: [
                  "team-item-boards",
                  teamId,
                  "memo",
                  createdMemo.originalId,
                ],
              });
            } else {
              // 個人モード用のキャッシュ無効化
              queryClient.invalidateQueries({
                queryKey: ["item-boards", "memo", createdMemo.originalId],
              });
            }
          }

          onSaveComplete?.(createdMemo, false, true);
        } else {
          // 空の新規メモは単に閉じる
          console.log(`⏭️ 空メモのため作成スキップ`);
          onSaveComplete?.(
            memo || {
              id: 0,
              title: "",
              content: "",
              createdAt: 0,
              updatedAt: 0,
            },
            true,
            true,
          );
        }
      }

      // 保存成功時に初期値を更新
      setInitialTitle(title.trim() || "");
      setInitialContent(content.trim() || "");

      // 保存成功後にボード選択状態を同期（hasChangesを正しく計算するため）
      // 少し遅延させてキャッシュ更新後に同期
      setTimeout(() => {
        setSelectedBoardIds([...selectedBoardIds]);
      }, 100);
    } catch (error) {
      console.error("保存に失敗:", error);
      setSaveError("保存に失敗しました");
    } finally {
      // 保存中表示をしっかり見せる
      setTimeout(() => setIsSaving(false), 400);
    }
  }, [
    memo,
    title,
    content,
    createNote,
    updateNote,
    deleteNote,
    onSaveComplete,
    addItemToBoard,
    selectedBoardIds,
    currentBoardIds,
    queryClient,
    removeItemFromBoard,
    isSaving,
    initialTitle,
    initialContent,
    initialBoardId,
    onDeleteAndSelectNext,
    teamMode,
    teamId,
  ]);

  const handleSave = useCallback(async () => {
    // ボードを外す場合のみモーダルを表示
    if (memo?.id) {
      const boardsToAdd = selectedBoardIds.filter(
        (id) => !currentBoardIds.includes(id),
      );
      const boardsToRemove = currentBoardIds.filter(
        (id) => !selectedBoardIds.includes(id),
      );

      if (boardsToRemove.length > 0) {
        setPendingBoardChanges({ boardsToAdd, boardsToRemove });
        setShowBoardChangeModal(true);
        return;
      }
    }

    // モーダル表示なしで保存実行
    await executeSave();
  }, [memo, selectedBoardIds, currentBoardIds, executeSave]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handleBoardChange = useCallback((boardIds: number[]) => {
    setSelectedBoardIds(boardIds);
  }, []);

  const handleConfirmBoardChange = useCallback(async () => {
    setShowBoardChangeModal(false);
    await executeSave();
  }, [executeSave]);

  const handleCancelBoardChange = useCallback(() => {
    setShowBoardChangeModal(false);
    setPendingBoardChanges({ boardsToAdd: [], boardsToRemove: [] });
    // ボード選択状態を元に戻す
    setSelectedBoardIds([...currentBoardIds]);
  }, [currentBoardIds]);

  const resetForm = useCallback(() => {
    setTitle("");
    setContent("");
    // 初期値もリセット（空メモ時に保存ボタンが有効にならないようにするため）
    setInitialTitle("");
    setInitialContent("");
    // ボード選択もリセット（initialBoardIdがある場合は維持）
    setSelectedBoardIds(initialBoardId ? [initialBoardId] : []);
  }, [initialBoardId]);

  return {
    title,
    content,
    selectedBoardIds,
    isSaving,
    saveError,
    hasChanges,
    handleSave,
    handleTitleChange,
    handleContentChange,
    handleBoardChange,
    showBoardChangeModal,
    pendingBoardChanges,
    handleConfirmBoardChange,
    handleCancelBoardChange,
    resetForm,
  };
}

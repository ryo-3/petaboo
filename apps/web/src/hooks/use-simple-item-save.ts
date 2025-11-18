import { useState, useCallback, useEffect, useMemo } from "react";
import type { Memo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";
import { OriginalIdUtils } from "@/src/types/common";
import { useCreateMemo, useUpdateMemo } from "@/src/hooks/use-memos";
import { useCreateTask, useUpdateTask } from "@/src/hooks/use-tasks";
import {
  useAddItemToBoard,
  useRemoveItemFromBoard,
} from "@/src/hooks/use-boards";
import { useQueryClient } from "@tanstack/react-query";
import { useTeamContext } from "@/src/contexts/team-context";
import { stripHtmlTags } from "@/src/utils/html";

type UnifiedItem = Memo | Task;

interface UseSimpleItemSaveOptions<T extends UnifiedItem> {
  item?: T | null;
  itemType: "memo" | "task";
  onSaveComplete?: (
    savedItem: T,
    wasEmpty: boolean,
    isNewItem: boolean,
  ) => void;
  currentBoardIds?: number[];
  initialBoardId?: number;
  onDeleteAndSelectNext?: (deletedItem: T) => void;
  // チーム機能（後方互換性のため残す、非推奨）
  teamMode?: boolean;
  teamId?: number;
  boardId?: number; // チームボードでのキャッシュ更新に使用
  hasTagChanges?: boolean;
  pendingImages?: Array<unknown>;
  pendingDeletes?: Array<unknown>;
  isDeleted?: boolean;
  isUploading?: boolean;
}

export function useSimpleItemSave<T extends UnifiedItem>({
  item = null,
  itemType,
  onSaveComplete,
  currentBoardIds = [],
  initialBoardId,
  onDeleteAndSelectNext,
  teamMode: teamModeProp = false,
  teamId: teamIdProp,
  boardId,
  hasTagChanges = false,
  pendingImages = [],
  pendingDeletes = [],
  isDeleted = false,
  isUploading = false,
}: UseSimpleItemSaveOptions<T>) {
  // TeamContextからチーム情報を取得（propsより優先）
  const { isTeamMode, teamId: teamIdFromContext } = useTeamContext();

  // propsとContextを統合（Contextを優先、後方互換性のためpropsも許容）
  const teamMode = isTeamMode || teamModeProp;
  const teamId = teamIdFromContext || teamIdProp;
  const [title, setTitle] = useState(() => item?.title || "");
  const [content, setContent] = useState(() => {
    if (itemType === "memo") {
      return (item as { content?: string | null })?.content || "";
    } else {
      return (item as { description?: string | null })?.description || "";
    }
  });
  const [priority, setPriority] = useState<"low" | "medium" | "high">(() =>
    itemType === "task" && item && "priority" in item
      ? (item.priority as "low" | "medium" | "high")
      : "medium",
  );
  const [status, setStatus] = useState<
    "not_started" | "in_progress" | "completed"
  >(() =>
    itemType === "task" && item && "status" in item
      ? (item.status as "not_started" | "in_progress" | "completed")
      : "not_started",
  );
  const [assigneeId, setAssigneeId] = useState<string | null>(() => {
    if (itemType === "task" && item && "assigneeId" in item) {
      return (item as Task).assigneeId ?? null;
    }
    return null;
  });
  const [initialAssigneeId, setInitialAssigneeId] = useState<string | null>(
    () => {
      if (itemType === "task" && item && "assigneeId" in item) {
        return (item as Task).assigneeId ?? null;
      }
      return null;
    },
  );
  const [categoryId, setCategoryId] = useState<number | null>(() => {
    if (itemType === "task" && item && "categoryId" in item) {
      return (item as Task).categoryId ?? null;
    }
    return null;
  });
  const [boardCategoryId, setBoardCategoryId] = useState<number | null>(() => {
    if (itemType === "task" && item && "boardCategoryId" in item) {
      return (item as Task).boardCategoryId ?? null;
    }
    return null;
  });
  const [initialCategoryId, setInitialCategoryId] = useState<number | null>(
    () => {
      if (itemType === "task" && item && "categoryId" in item) {
        return (item as Task).categoryId ?? null;
      }
      return null;
    },
  );
  const [initialBoardCategoryId, setInitialBoardCategoryId] = useState<
    number | null
  >(() => {
    if (itemType === "task" && item && "boardCategoryId" in item) {
      return (item as Task).boardCategoryId ?? null;
    }
    return null;
  });
  const [selectedBoardIds, setSelectedBoardIds] = useState<number[]>(() => {
    // 新規作成時でcurrentBoardIdsが空の場合はinitialBoardIdを使用
    if (currentBoardIds.length === 0 && initialBoardId) {
      return [initialBoardId];
    }
    return currentBoardIds;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showBoardChangeModal, setShowBoardChangeModal] = useState(false);
  const [pendingBoardChanges, setPendingBoardChanges] = useState<{
    boardsToAdd: number[];
    boardsToRemove: number[];
  }>({ boardsToAdd: [], boardsToRemove: [] });
  const [isInitialSync, setIsInitialSync] = useState(true);
  const [isItemTransition, setIsItemTransition] = useState(false);

  // アイテムが変更されたらボード選択をリセット
  const currentBoardIdsStr = JSON.stringify([...currentBoardIds].sort());
  useEffect(() => {
    setIsItemTransition(true); // アイテム切り替え開始
    setSelectedBoardIds([...currentBoardIds]);
    setIsInitialSync(true); // 初期同期開始

    // 少し遅延させて初期同期完了をマーク（500msに延長してボードID同期を確実にする）
    const timer = setTimeout(() => {
      // 確実に selectedBoardIds を currentBoardIds に再同期
      setSelectedBoardIds([...currentBoardIds]);
      setIsInitialSync(false);
      setIsItemTransition(false); // アイテム切り替え完了
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, currentBoardIdsStr]); // 文字列で比較

  // 変更検知用の初期値
  const [initialTitle, setInitialTitle] = useState(() => item?.title || "");
  const [initialContent, setInitialContent] = useState(() => {
    if (itemType === "memo") {
      return (item as { content?: string | null })?.content || "";
    } else {
      return (item as { description?: string | null })?.description || "";
    }
  });
  const [initialPriority, setInitialPriority] = useState<
    "low" | "medium" | "high"
  >(() =>
    itemType === "task" && item && "priority" in item
      ? (item.priority as "low" | "medium" | "high")
      : "medium",
  );
  const [initialStatus, setInitialStatus] = useState<
    "not_started" | "in_progress" | "completed"
  >(() =>
    itemType === "task" && item && "status" in item
      ? (item.status as "not_started" | "in_progress" | "completed")
      : "not_started",
  );

  // Memo hooks
  const createMemo = useCreateMemo({ teamMode, teamId, boardId });
  const updateMemo = useUpdateMemo({ teamMode, teamId, boardId });

  // Task hooks
  const createTask = useCreateTask({ teamMode, teamId, boardId });
  const updateTask = useUpdateTask({ teamMode, teamId, boardId });

  // Board hooks
  const addItemToBoard = useAddItemToBoard({ teamMode, teamId });
  const removeItemFromBoard = useRemoveItemFromBoard();
  const queryClient = useQueryClient();

  // HTMLタグを除去して実質的な内容を取得
  // 変更検知（ボード選択も含める）
  const hasChanges = useMemo(() => {
    // アイテム切り替え中または初期同期中は変更検知を完全に無効化
    if (isItemTransition || isInitialSync) {
      return false;
    }

    const currentTitle = title.trim();
    const currentContent = content.trim();

    // HTMLタグを除去した実質的な内容
    const strippedTitle = stripHtmlTags(currentTitle);
    const strippedContent = stripHtmlTags(currentContent);

    // 新規作成時（itemがnullまたはitem.id === 0）で、タイトルもコンテンツも空の場合は変更なし
    const isNewItem = !item || item.id === 0;
    if (isNewItem && !strippedTitle && !strippedContent) {
      return false;
    }

    const textChanged =
      currentTitle !== initialTitle.trim() ||
      currentContent !== initialContent.trim();

    // タスクの場合は優先度とステータスの変更もチェック
    let taskFieldsChanged = false;
    if (itemType === "task") {
      taskFieldsChanged =
        priority !== initialPriority ||
        status !== initialStatus ||
        (teamMode ? assigneeId !== initialAssigneeId : false) ||
        categoryId !== initialCategoryId ||
        boardCategoryId !== initialBoardCategoryId;
    }

    const hasBoardChanges =
      JSON.stringify([...selectedBoardIds].sort()) !==
      JSON.stringify([...currentBoardIds].sort());

    const result = textChanged || taskFieldsChanged || hasBoardChanges;

    return result;
  }, [
    item?.id,
    title,
    content,
    priority,
    status,
    assigneeId,
    categoryId,
    boardCategoryId,
    initialTitle,
    initialContent,
    initialPriority,
    initialStatus,
    initialAssigneeId,
    initialCategoryId,
    initialBoardCategoryId,
    selectedBoardIds,
    currentBoardIds,
    isInitialSync,
    isItemTransition,
    itemType,
    teamMode,
  ]);

  // アイテムが変更された時の初期値更新
  useEffect(() => {
    setIsItemTransition(true); // データ更新開始

    if (item) {
      const itemTitle = item.title || "";
      const itemContent =
        itemType === "memo"
          ? (item as { content?: string | null }).content || ""
          : (item as { description?: string | null }).description || "";

      setTitle(itemTitle);
      setContent(itemContent);
      // trim() を適用して保存時と同じ形式にする（余計な空白による誤検知を防ぐ）
      setInitialTitle(itemTitle.trim());
      setInitialContent(itemContent.trim());

      if (itemType === "task" && "priority" in item && "status" in item) {
        setPriority(item.priority as "low" | "medium" | "high");
        setStatus(item.status as "not_started" | "in_progress" | "completed");
        setInitialPriority(item.priority as "low" | "medium" | "high");
        setInitialStatus(
          item.status as "not_started" | "in_progress" | "completed",
        );
        const nextAssignee =
          "assigneeId" in item ? ((item as Task).assigneeId ?? null) : null;
        setAssigneeId(nextAssignee);
        setInitialAssigneeId(nextAssignee);

        const nextCategoryId =
          "categoryId" in item ? ((item as Task).categoryId ?? null) : null;
        const nextBoardCategoryId =
          "boardCategoryId" in item
            ? ((item as Task).boardCategoryId ?? null)
            : null;
        setCategoryId(nextCategoryId);
        setBoardCategoryId(nextBoardCategoryId);
        setInitialCategoryId(nextCategoryId);
        setInitialBoardCategoryId(nextBoardCategoryId);
      }
    } else {
      setTitle("");
      setContent("");
      setInitialTitle("");
      setInitialContent("");
      if (itemType === "task") {
        setPriority("medium");
        setStatus("not_started");
        setInitialPriority("medium");
        setInitialStatus("not_started");
        setAssigneeId(null);
        setInitialAssigneeId(null);
        setCategoryId(null);
        setBoardCategoryId(null);
        setInitialCategoryId(null);
        setInitialBoardCategoryId(null);
      }
    }

    // データ更新完了を少し遅延させてマーク（100msに延長）
    const timer = setTimeout(() => {
      setIsItemTransition(false);
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, itemType]);

  const executeSave = useCallback(async () => {
    const isEmpty = !title.trim() && !content.trim();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (item?.id) {
        // 既存アイテム更新
        if (isEmpty) {
          // 空アイテムの場合は保存しない（保存ボタンが無効化されるため、ここには到達しないはず）
          return;
        }

        // アイテム内容の変更があるかチェック（ボード変更は除く）
        const taskFieldChanged =
          itemType === "task" &&
          (priority !== initialPriority ||
            status !== initialStatus ||
            (teamMode ? assigneeId !== initialAssigneeId : false) ||
            categoryId !== initialCategoryId ||
            boardCategoryId !== initialBoardCategoryId);
        const hasContentChanges =
          (title.trim() || "無題") !== initialTitle.trim() ||
          content.trim() !== initialContent.trim() ||
          taskFieldChanged;

        let updatedItem = item as T;

        // アイテム内容に変更がある場合のみ更新
        if (hasContentChanges) {
          const updateData =
            itemType === "memo"
              ? {
                  title: title.trim() || "無題",
                  content: content.trim() || "",
                }
              : {
                  title: title.trim() || "無題",
                  description: content.trim() || "",
                  priority: priority as "low" | "medium" | "high",
                  status:
                    status === "not_started"
                      ? "todo"
                      : (status as "todo" | "in_progress" | "completed"),
                  ...(teamMode ? { assigneeId: assigneeId ?? null } : {}),
                  categoryId: categoryId ?? undefined,
                  boardCategoryId: boardCategoryId ?? undefined,
                };

          if (itemType === "memo") {
            await updateMemo.mutateAsync({
              id: item.id,
              data: updateData,
            });
          } else {
            await updateTask.mutateAsync({
              id: item.id,
              data: updateData,
            });
          }

          updatedItem =
            itemType === "memo"
              ? ({
                  ...item,
                  title: title.trim() || "無題",
                  content: content.trim() || "",
                  updatedAt: Math.floor(Date.now() / 1000),
                } as T)
              : ({
                  ...item,
                  title: title.trim() || "無題",
                  description: content.trim() || "",
                  priority,
                  status:
                    status === "not_started"
                      ? "todo"
                      : (status as "todo" | "in_progress" | "completed"),
                  ...(teamMode ? { assigneeId: assigneeId ?? null } : {}),
                  categoryId: categoryId ?? null,
                  boardCategoryId: boardCategoryId ?? null,
                  updatedAt: Math.floor(Date.now() / 1000),
                } as T);
        } else {
          // 内容に変更がない場合は現在の値を維持
          updatedItem =
            itemType === "memo"
              ? ({
                  ...item,
                  title: title.trim() || "無題",
                  content: content.trim() || "",
                } as T)
              : ({
                  ...item,
                  title: title.trim() || "無題",
                  description: content.trim() || "",
                  status:
                    status === "not_started"
                      ? "todo"
                      : (status as "todo" | "in_progress" | "completed"),
                  ...(teamMode ? { assigneeId: assigneeId ?? null } : {}),
                  categoryId: categoryId ?? null,
                  boardCategoryId: boardCategoryId ?? null,
                } as T);
        }

        // ボード変更の差分を計算して処理
        if (item.id) {
          // 追加するボード
          const boardsToAdd = selectedBoardIds.filter(
            (id) => !currentBoardIds.includes(id),
          );
          // 削除するボード
          const boardsToRemove = currentBoardIds.filter(
            (id) => !selectedBoardIds.includes(id),
          );

          const promises = [];

          // ボード追加
          if (boardsToAdd.length > 0 && item.id > 0) {
            const addPromises = boardsToAdd.map(async (boardId) => {
              try {
                await addItemToBoard.mutateAsync({
                  boardId,
                  data: {
                    itemType,
                    itemId: OriginalIdUtils.fromItem(item) || "",
                  },
                });
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
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
                  itemId: OriginalIdUtils.fromItem(item) || "",
                  itemType,
                  teamId,
                });
              } catch (error: unknown) {
                console.error(
                  `Failed to remove ${itemType} from board ${boardId}:`,
                  error,
                );
              }
            });
            promises.push(...removePromises);
          }

          if (promises.length > 0) {
            await Promise.all(promises);

            // ボード変更後にキャッシュを無効化
            if (teamMode && teamId) {
              // チームモード用のキャッシュ無効化
              queryClient.invalidateQueries({
                queryKey: [
                  "team-item-boards",
                  teamId,
                  itemType,
                  item.originalId,
                ],
              });
            } else {
              // 個人モード用のキャッシュ無効化
              queryClient.invalidateQueries({
                queryKey: ["item-boards", itemType, item.originalId],
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
          }

          // 現在のボードから外された場合は次のアイテムを選択
          if (
            initialBoardId &&
            boardsToRemove.includes(initialBoardId) &&
            onDeleteAndSelectNext
          ) {
            onDeleteAndSelectNext(updatedItem);
            return;
          }
        }

        // 保存成功後、初期値を更新（変更検知をリセット）
        setInitialTitle(title.trim() || "無題");
        setInitialContent(content.trim());
        if (itemType === "task") {
          setInitialPriority(priority);
          setInitialStatus(status);
          if (teamMode) {
            setInitialAssigneeId(assigneeId);
          }
          setInitialCategoryId(categoryId);
          setInitialBoardCategoryId(boardCategoryId);
        }

        onSaveComplete?.(updatedItem, false, false);
      } else {
        // 新規アイテム作成（空の場合は何もしない）
        if (!isEmpty) {
          const createData =
            itemType === "memo"
              ? {
                  title: title.trim() || "無題",
                  content: content.trim() || undefined,
                }
              : {
                  title: title.trim() || "無題",
                  description: content.trim() || undefined,
                  priority: priority as "low" | "medium" | "high",
                  status:
                    status === "not_started"
                      ? "todo"
                      : (status as "todo" | "in_progress" | "completed"),
                  ...(teamMode ? { assigneeId: assigneeId ?? null } : {}),
                  categoryId: categoryId ?? undefined,
                  boardCategoryId: boardCategoryId ?? undefined,
                };

          let createdItem: T;
          if (itemType === "memo") {
            createdItem = (await createMemo.mutateAsync(createData)) as T;
          } else {
            createdItem = (await createTask.mutateAsync(createData)) as T;
          }

          // ボード選択時または初期ボードID指定時はボードに追加
          if (
            (selectedBoardIds.length > 0 || initialBoardId) &&
            createdItem.id
          ) {
            // 初期ボードIDがある場合は必ず含める（個人・チーム共通）
            const boardIdsToAdd =
              initialBoardId && selectedBoardIds.length === 0
                ? [initialBoardId]
                : selectedBoardIds;

            // 各ボードに追加（エラーは個別にキャッチ）
            const addPromises = boardIdsToAdd.map(async (boardId) => {
              try {
                await addItemToBoard.mutateAsync({
                  boardId,
                  data: {
                    itemType,
                    itemId: OriginalIdUtils.fromItem(createdItem) || "",
                  },
                });
              } catch (error: unknown) {
                const errorMessage =
                  error instanceof Error ? error.message : String(error);
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
                  itemType,
                  createdItem.originalId,
                ],
              });
            } else {
              // 個人モード用のキャッシュ無効化
              queryClient.invalidateQueries({
                queryKey: ["item-boards", itemType, createdItem.originalId],
              });
            }
          }

          onSaveComplete?.(createdItem, false, true);
        } else {
          // 空の新規アイテムは単に閉じる
          const emptyItem =
            itemType === "memo"
              ? ({
                  id: 0,
                  title: "",
                  content: "",
                  createdAt: 0,
                  updatedAt: 0,
                } as T)
              : ({
                  id: 0,
                  title: "",
                  description: "",
                  createdAt: 0,
                  updatedAt: 0,
                  priority: "medium" as const,
                  status: "todo" as const,
                } as T);
          onSaveComplete?.(item || emptyItem, true, true);
        }
      }

      // 保存成功時に初期値を更新
      setInitialTitle(title.trim() || "");
      setInitialContent(content.trim() || "");
      if (itemType === "task") {
        setInitialPriority(priority);
        setInitialStatus(status);
        setInitialCategoryId(categoryId);
        setInitialBoardCategoryId(boardCategoryId);
      }

      // 保存成功後にボード選択状態を同期（hasChangesを正しく計算するため）
      // 少し遅延させてキャッシュ更新後に同期
      setTimeout(() => {
        setSelectedBoardIds([...selectedBoardIds]);
      }, 100);
    } catch (error) {
      setSaveError("保存に失敗しました");
    } finally {
      // 保存中表示をしっかり見せる
      setTimeout(() => {
        setIsSaving(false);
      }, 400);
    }
  }, [
    item,
    itemType,
    title,
    content,
    priority,
    status,
    assigneeId,
    categoryId,
    boardCategoryId,
    createMemo,
    updateMemo,
    createTask,
    updateTask,
    onSaveComplete,
    addItemToBoard,
    selectedBoardIds,
    currentBoardIds,
    queryClient,
    removeItemFromBoard,
    isSaving,
    initialTitle,
    initialContent,
    initialPriority,
    initialStatus,
    initialAssigneeId,
    initialCategoryId,
    initialBoardCategoryId,
    initialBoardId,
    onDeleteAndSelectNext,
    teamMode,
    teamId,
  ]);

  const handleSave = useCallback(async () => {
    // ボードを外す場合のみモーダルを表示
    if (item?.id) {
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
  }, [item, selectedBoardIds, currentBoardIds, executeSave]);

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
  }, []);

  const handlePriorityChange = useCallback(
    (newPriority: "low" | "medium" | "high") => {
      setPriority(newPriority);
    },
    [],
  );

  const handleStatusChange = useCallback(
    (newStatus: "not_started" | "in_progress" | "completed") => {
      setStatus(newStatus);
    },
    [],
  );

  const handleAssigneeChange = useCallback((newAssigneeId: string | null) => {
    setAssigneeId(newAssigneeId ?? null);
  }, []);

  const handleCategoryChange = useCallback((newCategoryId: number | null) => {
    setCategoryId(newCategoryId);
  }, []);

  const handleBoardCategoryChange = useCallback(
    (newBoardCategoryId: number | null) => {
      setBoardCategoryId(newBoardCategoryId);
    },
    [],
  );

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
    // 初期値もリセット（空アイテム時に保存ボタンが有効にならないようにするため）
    setInitialTitle("");
    setInitialContent("");
    if (itemType === "task") {
      setPriority("medium");
      setStatus("not_started");
      setInitialPriority("medium");
      setInitialStatus("not_started");
      setAssigneeId(null);
      setInitialAssigneeId(null);
      setCategoryId(null);
      setBoardCategoryId(null);
      setInitialCategoryId(null);
      setInitialBoardCategoryId(null);
    }
    // ボード選択もリセット（initialBoardIdがある場合は維持）
    setSelectedBoardIds(initialBoardId ? [initialBoardId] : []);
  }, [initialBoardId, itemType]);

  const canSave = useMemo(() => {
    const strippedTitle = stripHtmlTags(title);
    const isNewItem = !item || item.id === 0;
    const hasAttachmentChanges =
      pendingImages.length > 0 || pendingDeletes.length > 0;

    if (isDeleted) return false;
    if (isUploading) return false;
    if (isNewItem) return !!strippedTitle;

    return (
      (hasChanges || hasTagChanges || hasAttachmentChanges) && !!strippedTitle
    );
  }, [
    title,
    item,
    isDeleted,
    isUploading,
    hasChanges,
    hasTagChanges,
    pendingImages.length,
    pendingDeletes.length,
  ]);

  const hasUnsavedChanges = useMemo(() => {
    const strippedTitle = stripHtmlTags(title);
    const strippedContent = stripHtmlTags(content);
    const isNewItem = !item || item.id === 0;

    if (isNewItem) {
      return !!strippedTitle || !!strippedContent || pendingImages.length > 0;
    }

    return (
      hasChanges ||
      hasTagChanges ||
      pendingImages.length > 0 ||
      pendingDeletes.length > 0
    );
  }, [
    title,
    content,
    item,
    hasChanges,
    hasTagChanges,
    pendingImages.length,
    pendingDeletes.length,
  ]);

  return {
    title,
    content,
    ...(itemType === "task" && {
      priority,
      status,
      assigneeId,
      categoryId,
      boardCategoryId,
    }),
    selectedBoardIds,
    isSaving,
    saveError,
    hasChanges,
    canSave,
    hasUnsavedChanges,
    isInitialSync, // タグ変更検知でも使用するためエクスポート
    handleSave,
    handleTitleChange,
    handleContentChange,
    ...(itemType === "task" && {
      handlePriorityChange,
      handleStatusChange,
      handleAssigneeChange,
      handleCategoryChange,
      handleBoardCategoryChange,
    }),
    handleBoardChange,
    showBoardChangeModal,
    pendingBoardChanges,
    handleConfirmBoardChange,
    handleCancelBoardChange,
    resetForm,
  };
}

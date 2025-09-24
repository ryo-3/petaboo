import { useState } from "react";
import { useRestoreMemo } from "@/src/hooks/use-memos";
import type { DeletedMemo } from "@/src/types/memo";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { memosApi } from "@/src/lib/api-client";

interface UseDeletedMemoActionsProps {
  memo: DeletedMemo | null;
  onClose: () => void;
  onDeleteAndSelectNext?: (deletedMemo: DeletedMemo) => void;
  onRestoreAndSelectNext?: (deletedMemo: DeletedMemo) => void;
  onAnimationChange?: (isAnimating: boolean) => void;
  teamMode?: boolean;
  teamId?: number;
  boardId?: number;
  skipAutoSelectionOnRestore?: boolean; // 復元時の自動選択をスキップ
  totalDeletedCount?: number; // 削除済みアイテムの総数
}

export function useDeletedMemoActions({
  memo,
  onClose,
  onDeleteAndSelectNext,
  onRestoreAndSelectNext,
  onAnimationChange,
  teamMode = false,
  teamId,
  boardId,
  skipAutoSelectionOnRestore = false,
  totalDeletedCount = 0,
}: UseDeletedMemoActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLocalRestoring, setIsLocalRestoring] = useState(false);
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  // 完全削除用のカスタムミューテーション（onSuccessで次選択を実行）
  const permanentDeleteNote = useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken();

      if (teamMode && teamId) {
        // チームモード: チーム用完全削除API
        const response = await memosApi.permanentDeleteTeamMemo(
          teamId,
          originalId,
          token || undefined,
        );
        return response.json();
      } else {
        // 個人モード: 個人用完全削除API
        const response = await memosApi.permanentDeleteNote(
          originalId,
          token || undefined,
        );
        return response.json();
      }
    },
    onError: (error) => {
      console.error("permanentDeleteNote ミューテーションエラー:", error);
    },
    onSuccess: async () => {
      // キャッシュを手動更新（削除されたアイテムをすぐに除去）
      if (teamMode && teamId) {
        // チームモード: チーム削除済みメモキャッシュを更新（存在する場合のみ）
        const existingData = queryClient.getQueryData([
          "team-deleted-memos",
          teamId,
        ]);
        if (existingData) {
          queryClient.setQueryData(
            ["team-deleted-memos", teamId],
            (oldDeletedMemos: DeletedMemo[] | undefined) => {
              if (!oldDeletedMemos) return [];
              return oldDeletedMemos.filter(
                (m) => memo && m.originalId !== memo.originalId,
              );
            },
          );
        }
      } else {
        // 個人モード: 個人削除済みメモキャッシュを更新（存在する場合のみ）
        const existingData = queryClient.getQueryData(["deletedMemos"]);
        if (existingData) {
          queryClient.setQueryData(
            ["deletedMemos"],
            (oldDeletedMemos: DeletedMemo[] | undefined) => {
              if (!oldDeletedMemos) return [];
              return oldDeletedMemos.filter(
                (m) => memo && m.originalId !== memo.originalId,
              );
            },
          );
        }
      }

      // ボード固有の削除済みアイテムキャッシュも手動更新（teamIdを文字列に統一）
      const boardDeletedItemsQueryKey =
        teamMode && teamId && boardId
          ? ["team-board-deleted-items", teamId.toString(), boardId]
          : ["board-deleted-items", boardId];

      // 既存のキャッシュがある場合のみ更新
      const existingBoardData = queryClient.getQueryData(
        boardDeletedItemsQueryKey,
      );
      if (existingBoardData) {
        queryClient.setQueryData(boardDeletedItemsQueryKey, (oldItems: any) => {
          if (!oldItems) {
            return null;
          }

          // 削除済みアイテム構造: { memos: [], tasks: [] }
          if (oldItems.memos) {
            return {
              ...oldItems,
              memos: oldItems.memos.filter(
                (item: any) => memo && item.originalId !== memo.originalId,
              ),
            };
          }

          return oldItems;
        });
      }

      // 即座に次のメモ選択機能を使用（手動更新済みなのでタイミング問題なし）
      if (onDeleteAndSelectNext && memo) {
        onDeleteAndSelectNext(memo);
      } else {
        onClose();
      }

      // 最後にキャッシュを無効化して最新データを取得（安全なアプローチ）
      if (teamMode && teamId) {
        await queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-deleted-memos" && key[1] === teamId?.toString()
            );
          },
        });

        if (boardId) {
          await queryClient.invalidateQueries({
            queryKey: ["team-board-deleted-items", teamId.toString(), boardId],
          });
        }
      } else {
        await queryClient.invalidateQueries({ queryKey: ["deletedMemos"] });

        if (boardId) {
          await queryClient.invalidateQueries({
            queryKey: ["board-deleted-items", boardId],
          });
        }
      }
    },
  });

  const restoreNote = useRestoreMemo({ teamMode, teamId, boardId });

  const handlePermanentDelete = async () => {
    try {
      setShowDeleteModal(false);

      // エディターコンテンツをゴミ箱に吸い込むアニメーション
      const editorArea = document.querySelector(
        "[data-memo-editor]",
      ) as HTMLElement;
      const rightTrashButton = document.querySelector(
        "[data-right-panel-trash]",
      ) as HTMLElement;

      if (editorArea && rightTrashButton) {
        const { animateEditorContentToTrashCSS } = await import(
          "@/src/utils/deleteAnimation"
        );
        animateEditorContentToTrashCSS(
          editorArea,
          rightTrashButton,
          async () => {
            // アニメーション完了後の処理
            try {
              // API実行（onSuccessで次選択とキャッシュ更新が実行される）
              if (memo) {
                await permanentDeleteNote.mutateAsync(memo.originalId);
              }

              // アニメーション状態をリセットしてから蓋を閉じる
              onAnimationChange?.(false);
              setTimeout(() => {
                (
                  window as Window & { closeDeletingLid?: () => void }
                ).closeDeletingLid?.();
              }, 500);
            } catch (error) {
              console.error("完全削除エラー (アニメーション内):", error);
              onAnimationChange?.(false);
              alert("完全削除に失敗しました。");
            }
          },
        );
      } else {
        // アニメーション要素がない場合は通常の処理
        // API実行（onSuccessで次選択とキャッシュ更新が実行される）
        if (memo) {
          await permanentDeleteNote.mutateAsync(memo.originalId);
        }

        // アニメーション状態をリセットしてから蓋を閉じる
        onAnimationChange?.(false);
        setTimeout(() => {
          (
            window as Window & { closeDeletingLid?: () => void }
          ).closeDeletingLid?.();
        }, 500);
      }
    } catch (error) {
      console.error("完全削除エラー (メイン):", error);
      onAnimationChange?.(false);
      alert("完全削除に失敗しました。");
    }
  };

  const handleRestore = async () => {
    console.log("🔔 useDeletedMemoActions.handleRestore 開始", {
      memoId: memo?.id,
      memoOriginalId: memo?.originalId,
      isLocalRestoring,
      isPending: restoreNote.isPending,
      teamMode,
      teamId,
      totalDeletedCount,
      skipAutoSelectionOnRestore,
      hasOnRestoreAndSelectNext: !!onRestoreAndSelectNext,
    });

    // 削除直後の復元で totalDeletedCount が正しくない場合のデバッグ
    // キャッシュ問題回避: 復元処理が実行される = 最低1つは削除済みアイテムがある
    const safeDeletedCount = Math.max(totalDeletedCount, 1);

    console.log("🔧 削除済みアイテム数の安全な調整", {
      originalCount: totalDeletedCount,
      adjustedCount: safeDeletedCount,
      wasAdjusted: safeDeletedCount !== totalDeletedCount,
      reason: "キャッシュ問題回避",
    });

    if (safeDeletedCount <= 1) {
      console.log("⚠️ 調整後も1以下 - 画面が閉じる予定", {
        safeDeletedCount,
        willClose: true,
        reason: "最後のアイテム（調整後）",
      });
    } else {
      console.log("✅ 調整後、次選択処理が実行される予定", {
        safeDeletedCount,
        willSelectNext: true,
      });
    }

    // 既に復元中または削除中の場合は早期リターン（連続実行防止）
    if (isLocalRestoring || restoreNote.isPending) {
      console.log("❌ 復元処理をスキップ（既に実行中）");
      return;
    }

    try {
      setIsLocalRestoring(true);

      // エディターコンテンツを復元アニメーション付きで処理
      const editorArea = document.querySelector(
        "[data-memo-editor]",
      ) as HTMLElement;
      const rightTrashButton = document.querySelector(
        "[data-right-panel-trash]",
      ) as HTMLElement;

      if (editorArea && rightTrashButton) {
        const { animateEditorContentToTrashCSS } = await import(
          "@/src/utils/deleteAnimation"
        );
        animateEditorContentToTrashCSS(
          editorArea,
          rightTrashButton,
          async () => {
            // アニメーション完了後の処理
            try {
              // API実行
              if (memo) {
                await restoreNote.mutateAsync(memo.originalId);
              }

              // 復元完了後、すぐにUIを更新
              setIsLocalRestoring(false);

              // 削除済みアイテム数の動的チェック（キャッシュ問題回避）
              const safeCount = Math.max(totalDeletedCount, 1);
              const remainingCount = safeCount > 0 ? safeCount - 1 : 0;
              console.log(
                "🔍 復元後の残り削除済みアイテム数チェック（アニメーション版）",
                {
                  originalCount: totalDeletedCount,
                  safeCount,
                  remainingCount,
                  willClose: remainingCount <= 0,
                },
              );

              // 復元後に残りアイテムがない場合のみ閉じる
              if (remainingCount <= 0) {
                console.log(
                  "✅ 残りアイテムなし - 画面を閉じる（アニメーション版）",
                );
                onClose();
              } else if (
                !skipAutoSelectionOnRestore &&
                onRestoreAndSelectNext &&
                memo
              ) {
                console.log("🎯 復元後の次選択実行（アニメーション版）", {
                  skipAutoSelectionOnRestore,
                  hasOnRestoreAndSelectNext: !!onRestoreAndSelectNext,
                  memoOriginalId: memo.originalId,
                  remainingCount,
                });

                // キャッシュ更新完了を待ってから次選択実行
                setTimeout(() => {
                  console.log(
                    "⏰ キャッシュ更新待機後、次選択実行（アニメーション版）",
                  );
                  onRestoreAndSelectNext(memo);
                }, 50);
              } else if (!skipAutoSelectionOnRestore) {
                console.log(
                  "✅ skipAutoSelectionOnRestore=false - 画面を閉じる（アニメーション版）",
                );
                onClose();
              }
              // skipAutoSelectionOnRestore=trueで最後でない場合は何もしない（アイテムを開いたまま）
            } catch (error) {
              console.error("メモ復元エラー (アニメーション内):", error);
              console.error("復元エラーの詳細:", {
                memoId: memo?.id,
                originalId: memo?.originalId,
                teamMode,
                teamId,
                error,
                errorMessage:
                  error instanceof Error ? error.message : "不明なエラー",
                stack: error instanceof Error ? error.stack : undefined,
              });
              setIsLocalRestoring(false);
              alert("復元に失敗しました。");
            }
          },
          "restore", // 復元処理であることを明示
        );
      } else {
        // アニメーション要素がない場合は通常の処理
        if (memo) {
          await restoreNote.mutateAsync(memo.originalId);
        }

        setIsLocalRestoring(false);

        // 削除済みアイテム数の動的チェック（キャッシュ問題回避）
        const safeCount = Math.max(totalDeletedCount, 1);
        const remainingCount = safeCount > 0 ? safeCount - 1 : 0;
        console.log(
          "🔍 復元後の残り削除済みアイテム数チェック（アニメーションなし）",
          {
            originalCount: totalDeletedCount,
            safeCount,
            remainingCount,
            willClose: remainingCount <= 0,
          },
        );

        // 復元後に残りアイテムがない場合のみ閉じる
        if (remainingCount <= 0) {
          console.log(
            "✅ 残りアイテムなし - 画面を閉じる（アニメーションなし）",
          );
          onClose();
        } else if (
          !skipAutoSelectionOnRestore &&
          onRestoreAndSelectNext &&
          memo
        ) {
          console.log("🎯 復元後の次選択実行（アニメーションなし）", {
            skipAutoSelectionOnRestore,
            hasOnRestoreAndSelectNext: !!onRestoreAndSelectNext,
            memoOriginalId: memo.originalId,
            remainingCount,
          });

          // キャッシュ更新完了を待ってから次選択実行
          setTimeout(() => {
            console.log(
              "⏰ キャッシュ更新待機後、次選択実行（アニメーションなし）",
            );
            onRestoreAndSelectNext(memo);
          }, 50);
        } else if (!skipAutoSelectionOnRestore) {
          console.log(
            "✅ skipAutoSelectionOnRestore=false - 画面を閉じる（アニメーションなし）",
          );
          onClose();
        }
        // skipAutoSelectionOnRestore=trueで最後でない場合は何もしない（アイテムを開いたまま）
      }
    } catch (error) {
      console.error("メモ復元エラー:", error);
      console.error("復元エラーの詳細:", {
        memoId: memo?.id,
        originalId: memo?.originalId,
        teamMode,
        teamId,
        error,
        errorMessage: error instanceof Error ? error.message : "不明なエラー",
        stack: error instanceof Error ? error.stack : undefined,
      });
      setIsLocalRestoring(false);
      alert("復元に失敗しました。");
    }
  };

  const showDeleteConfirmation = () => {
    setShowDeleteModal(true);
  };

  const hideDeleteConfirmation = () => {
    setShowDeleteModal(false);
    // アニメーション状態をリセット
    onAnimationChange?.(false);
    // キャンセル時も蓋を閉じる
    setTimeout(() => {
      (
        window as Window & { closeDeletingLid?: () => void }
      ).closeDeletingLid?.();
    }, 100);
  };

  return {
    // Actions
    handlePermanentDelete,
    handleRestore,
    showDeleteConfirmation,
    hideDeleteConfirmation,

    // Modal state
    showDeleteModal,

    // Loading states
    isDeleting: permanentDeleteNote.isPending,
    isRestoring: restoreNote.isPending || isLocalRestoring,
  };
}

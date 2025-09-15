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
        // チームモード: チーム削除済みメモキャッシュを更新
        queryClient.setQueryData(
          ["team-deleted-memos", teamId],
          (oldDeletedMemos: DeletedMemo[] | undefined) => {
            if (!oldDeletedMemos) return [];
            return oldDeletedMemos.filter(
              (m) => memo && m.originalId !== memo.originalId,
            );
          },
        );
      } else {
        // 個人モード: 個人削除済みメモキャッシュを更新
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

      // ボード固有の削除済みアイテムキャッシュも手動更新（teamIdを文字列に統一）
      const boardDeletedItemsQueryKey =
        teamMode && teamId && boardId
          ? ["team-board-deleted-items", teamId.toString(), boardId]
          : ["board-deleted-items", boardId];

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

      // 即座に次のメモ選択機能を使用（手動更新済みなのでタイミング問題なし）
      if (onDeleteAndSelectNext && memo) {
        onDeleteAndSelectNext(memo);
      } else {
        onClose();
      }

      // 最後にキャッシュを無効化して最新データを取得（安全なアプローチ）
      if (teamMode && teamId) {
        await queryClient.invalidateQueries({
          queryKey: ["team-deleted-memos", teamId],
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

              if (onRestoreAndSelectNext && memo) {
                onRestoreAndSelectNext(memo);
              } else {
                onClose();
              }
            } catch (error) {
              console.error("メモ復元エラー (アニメーション内):", error);
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

        if (onRestoreAndSelectNext && memo) {
          onRestoreAndSelectNext(memo);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error("メモ復元エラー:", error);
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

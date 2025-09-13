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
      const response = await memosApi.permanentDeleteNote(
        originalId,
        token || undefined,
      );
      return response.json();
    },
    onSuccess: async () => {
      // キャッシュを手動更新（削除されたアイテムをすぐに除去）
      queryClient.setQueryData(
        ["deletedMemos"],
        (oldDeletedMemos: DeletedMemo[] | undefined) => {
          if (!oldDeletedMemos) return [];
          return oldDeletedMemos.filter(
            (m) => memo && m.originalId !== memo.originalId,
          );
        },
      );

      // ボード固有の削除済みアイテムキャッシュも手動更新
      queryClient.setQueryData(
        ["board-deleted-items"],
        (oldItems: any[] | undefined) => {
          if (!oldItems) return [];
          return oldItems.filter(
            (item: any) => memo && item.originalId !== memo.originalId,
          );
        },
      );

      // 即座に次のメモ選択機能を使用（手動更新済みなのでタイミング問題なし）
      if (onDeleteAndSelectNext && memo) {
        onDeleteAndSelectNext(memo);
      } else {
        onClose();
      }

      // 最後にキャッシュを無効化して最新データを取得
      queryClient.invalidateQueries({ queryKey: ["deletedMemos"] });
      queryClient.invalidateQueries({ queryKey: ["board-deleted-items"] });
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
            } catch {
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
    } catch {
      onAnimationChange?.(false);
      alert("完全削除に失敗しました。");
    }
  };

  const handleRestore = async () => {
    console.log(
      `🔄 復元処理開始: memo.id=${memo?.id}, memo.originalId=${memo?.originalId}, teamMode=${teamMode}, teamId=${teamId}`,
    );
    try {
      setIsLocalRestoring(true);
      // API実行
      if (memo) {
        console.log(
          `📤 復元API呼び出し: originalId=${memo.originalId}, teamMode=${teamMode}`,
        );
        await restoreNote.mutateAsync(memo.originalId);
        console.log(`✅ 復元API成功: originalId=${memo.originalId}`);
      }

      // 復元完了後、すぐにUIを更新
      setIsLocalRestoring(false);
      console.log(
        `🎯 UI更新処理: onRestoreAndSelectNext=${!!onRestoreAndSelectNext}`,
      );
      if (onRestoreAndSelectNext && memo) {
        console.log(
          `⏭️ 次のアイテム選択実行: memo.originalId=${memo.originalId}`,
        );
        onRestoreAndSelectNext(memo);
      } else {
        console.log(`❌ パネルを閉じる`);
        onClose();
      }
      console.log(`🏁 復元処理完了: memo.originalId=${memo?.originalId}`);
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

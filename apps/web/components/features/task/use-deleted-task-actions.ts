import { useState } from "react";
import { useRestoreTask } from "@/src/hooks/use-tasks";
import type { DeletedTask } from "@/src/types/task";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { tasksApi } from "@/src/lib/api-client";

interface UseDeletedTaskActionsProps {
  task: DeletedTask | null;
  onClose: () => void;
  onDeleteAndSelectNext?: (
    deletedTask: DeletedTask,
    preDeleteDisplayOrder?: number[],
  ) => void;
  onRestoreAndSelectNext?: (deletedTask: DeletedTask) => void;
  onAnimationChange?: (isAnimating: boolean) => void;
}

export function useDeletedTaskActions({
  task,
  onClose,
  onDeleteAndSelectNext,
  onRestoreAndSelectNext,
  onAnimationChange,
}: UseDeletedTaskActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  // 完全削除用のカスタムミューテーション（onSuccessで次選択を実行）
  const permanentDeleteTask = useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken();
      const response = await tasksApi.permanentDeleteTask(
        originalId,
        token || undefined,
      );
      return response.json();
    },
    onSuccess: async () => {
      // キャッシュを手動更新（削除されたアイテムをすぐに除去）
      queryClient.setQueryData(
        ["deleted-tasks"],
        (oldDeletedTasks: DeletedTask[] | undefined) => {
          if (!oldDeletedTasks) return [];
          return oldDeletedTasks.filter(
            (t) => task && t.originalId !== task.originalId,
          );
        },
      );

      // ボード固有の削除済みアイテムキャッシュも手動更新
      queryClient.setQueryData(
        ["board-deleted-items"],
        (oldItems: any[] | undefined) => {
          if (!oldItems) return [];
          return oldItems.filter(
            (item: any) => task && item.originalId !== task.originalId,
          );
        },
      );

      // 即座に次のタスク選択機能を使用（手動更新済みなのでタイミング問題なし）
      if (onDeleteAndSelectNext && task) {
        onDeleteAndSelectNext(task);
      } else {
        onClose();
      }

      // 最後にキャッシュを無効化して最新データを取得
      queryClient.invalidateQueries({ queryKey: ["deleted-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["board-deleted-items"] });
    },
  });

  const restoreTask = useRestoreTask();

  const handlePermanentDelete = async () => {
    try {
      setShowDeleteModal(false);

      // エディターコンテンツをゴミ箱に吸い込むアニメーション
      const editorArea = document.querySelector(
        "[data-task-editor]",
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
              if (task) {
                await permanentDeleteTask.mutateAsync(task.originalId);
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
        if (task) {
          await permanentDeleteTask.mutateAsync(task.originalId);
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
    try {
      // API実行
      if (task) {
        await restoreTask.mutateAsync(task.originalId);
      }

      // 復元完了後、すぐにUIを更新（メモと同じタイミング）
      if (onRestoreAndSelectNext && task) {
        onRestoreAndSelectNext(task);
      } else {
        onClose();
      }
    } catch {
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
    isDeleting: permanentDeleteTask.isPending,
    isRestoring: restoreTask.isPending,
  };
}

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
  onRestoreAndSelectNext?: () => void;
  onAnimationChange?: (isAnimating: boolean) => void;
  teamMode?: boolean;
  teamId?: number;
  boardId?: number;
  skipAutoSelectionOnRestore?: boolean; // 復元時の自動選択をスキップ
  totalDeletedCount?: number; // 削除済みアイテムの総数
}

export function useDeletedTaskActions({
  task,
  onClose,
  onDeleteAndSelectNext,
  onRestoreAndSelectNext,
  onAnimationChange,
  teamMode = false,
  teamId,
  boardId,
  skipAutoSelectionOnRestore = false,
  totalDeletedCount,
}: UseDeletedTaskActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  // 完全削除用のカスタムミューテーション（onSuccessで次選択を実行）
  const permanentDeleteTask = useMutation({
    mutationFn: async (itemId: string) => {
      const token = await getToken();

      if (teamMode && teamId) {
        // チームモード: displayIdを使用
        const response = await tasksApi.permanentDeleteTeamTask(
          teamId,
          itemId,
          token || undefined,
        );
        return response.json();
      } else {
        // 個人モード: originalIdを使用
        const response = await tasksApi.permanentDeleteTask(
          itemId,
          token || undefined,
        );
        return response.json();
      }
    },
    onError: (error) => {
      console.error("permanentDeleteTask ミューテーションエラー:", error);
    },
    onSuccess: async () => {
      // キャッシュを手動更新（削除されたアイテムをすぐに除去）
      if (teamMode && teamId) {
        // チームモード: チーム削除済みタスクキャッシュを更新
        queryClient.setQueryData(
          ["team-deleted-tasks", teamId],
          (oldDeletedTasks: DeletedTask[] | undefined) => {
            if (!oldDeletedTasks) return [];
            const filteredTasks = oldDeletedTasks.filter(
              (t) =>
                task &&
                (teamMode
                  ? t.displayId !== task.displayId
                  : t.originalId !== task.originalId),
            );
            return filteredTasks;
          },
        );
      } else {
        // 個人モード: 個人削除済みタスクキャッシュを更新
        queryClient.setQueryData(
          ["deleted-tasks"],
          (oldDeletedTasks: DeletedTask[] | undefined) => {
            if (!oldDeletedTasks) return [];
            const filteredTasks = oldDeletedTasks.filter(
              (t) =>
                task &&
                (teamMode
                  ? t.displayId !== task.displayId
                  : t.originalId !== task.originalId),
            );
            return filteredTasks;
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
        if (oldItems.tasks) {
          const filteredItems = {
            ...oldItems,
            tasks: oldItems.tasks.filter(
              (item: any) =>
                task &&
                (teamMode
                  ? item.displayId !== task.displayId
                  : item.originalId !== task.originalId),
            ),
          };
          return filteredItems;
        }

        return oldItems;
      });

      // 即座に次のタスク選択機能を使用（手動更新済みなのでタイミング問題なし）
      if (onDeleteAndSelectNext && task) {
        onDeleteAndSelectNext(task);
      } else {
        onClose();
      }

      // 最後にキャッシュを無効化して最新データを取得（安全なアプローチ）
      if (teamMode && teamId) {
        await queryClient.invalidateQueries({
          queryKey: ["team-deleted-tasks", teamId],
        });
        // チーム削除済みタスク一覧の条件付き強制再取得（アクティブクエリのみ）
        const teamDeletedTasksQueries = queryClient.getQueryCache().findAll({
          queryKey: ["team-deleted-tasks", teamId],
          type: "active",
        });
        if (teamDeletedTasksQueries.length > 0) {
          await queryClient.refetchQueries({
            queryKey: ["team-deleted-tasks", teamId],
          });
        }

        if (boardId) {
          const teamIdString = teamId.toString();
          await queryClient.invalidateQueries({
            queryKey: ["team-board-deleted-items", teamIdString, boardId],
          });
          // ボード削除済みアイテムの条件付き強制再取得（アクティブクエリのみ）
          const boardDeletedItemsQueries = queryClient.getQueryCache().findAll({
            queryKey: ["team-board-deleted-items", teamIdString, boardId],
            type: "active",
          });

          if (boardDeletedItemsQueries.length > 0) {
            await queryClient.refetchQueries({
              queryKey: ["team-board-deleted-items", teamIdString, boardId],
            });
          }
        }
      } else {
        await queryClient.invalidateQueries({ queryKey: ["deleted-tasks"] });
        // 個人削除済みタスク一覧の条件付き強制再取得（アクティブクエリのみ）
        const personalDeletedTasksQueries = queryClient
          .getQueryCache()
          .findAll({
            queryKey: ["deleted-tasks"],
            type: "active",
          });
        if (personalDeletedTasksQueries.length > 0) {
          await queryClient.refetchQueries({ queryKey: ["deleted-tasks"] });
        }

        if (boardId) {
          await queryClient.invalidateQueries({
            queryKey: ["board-deleted-items", boardId],
          });
          const boardDeletedItemsQueries = queryClient.getQueryCache().findAll({
            queryKey: ["board-deleted-items", boardId],
            type: "active",
          });
          if (boardDeletedItemsQueries.length > 0) {
            await queryClient.refetchQueries({
              queryKey: ["board-deleted-items", boardId],
            });
          }
        }
      }
    },
  });

  // 復元用のカスタムミューテーション（チーム対応）
  const restoreTask = useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken();

      if (teamMode && teamId) {
        // チームモード: チーム用復元API
        const response = await tasksApi.restoreTeamTask(
          teamId,
          originalId,
          token || undefined,
        );
        return response.json();
      } else {
        // 個人モード: 個人用復元API
        const response = await tasksApi.restoreTask(
          originalId,
          token || undefined,
        );
        return response.json();
      }
    },
    onError: (error: any) => {
      console.error("restoreTask ミューテーションエラー:", error);
      console.error("エラー詳細:", {
        message: error?.message || "メッセージなし",
        stack: error?.stack || "スタックトレースなし",
        name: error?.name || "エラー名なし",
      });
    },
    onSuccess: async (restoredTaskData) => {
      // 復元されたタスクをボードアイテムキャッシュに楽観的追加
      if (boardId && task) {
        const boardItemsQueryKey =
          teamMode && teamId
            ? ["team-boards", teamId.toString(), boardId, "items"]
            : ["boards", boardId, "items"];

        queryClient.setQueryData(boardItemsQueryKey, (oldBoardData: any) => {
          if (!oldBoardData || !oldBoardData.items) {
            return oldBoardData;
          }

          // 復元されたタスクのデータを作成（deletedAtを削除して通常のタスクに戻す）
          const restoredTask = {
            ...task,
            deletedAt: undefined, // 削除日時を削除
            // APIから返されたデータがあれば使用
            ...(restoredTaskData || {}),
          };

          // 新しいボードアイテムを作成
          const newBoardItem = {
            itemType: "task",
            itemId: restoredTask.id.toString(),
            originalId: restoredTask.originalId,
            addedAt: Date.now(), // 現在時刻で追加
            content: restoredTask,
          };

          const updatedItems = [...oldBoardData.items, newBoardItem];

          return {
            ...oldBoardData,
            items: updatedItems,
          };
        });
      }

      // キャッシュを手動更新（復元されたアイテムをすぐに除去）
      if (teamMode && teamId) {
        // チームモード: チーム削除済みタスクキャッシュを更新
        queryClient.setQueryData(
          ["team-deleted-tasks", teamId],
          (oldDeletedTasks: DeletedTask[] | undefined) => {
            if (!oldDeletedTasks) return [];
            const filteredTasks = oldDeletedTasks.filter(
              (t) =>
                task &&
                (teamMode
                  ? t.displayId !== task.displayId
                  : t.originalId !== task.originalId),
            );
            return filteredTasks;
          },
        );
      } else {
        // 個人モード: 個人削除済みタスクキャッシュを更新
        queryClient.setQueryData(
          ["deleted-tasks"],
          (oldDeletedTasks: DeletedTask[] | undefined) => {
            if (!oldDeletedTasks) return [];
            const filteredTasks = oldDeletedTasks.filter(
              (t) =>
                task &&
                (teamMode
                  ? t.displayId !== task.displayId
                  : t.originalId !== task.originalId),
            );
            return filteredTasks;
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
        if (oldItems.tasks) {
          const filteredItems = {
            ...oldItems,
            tasks: oldItems.tasks.filter(
              (item: any) =>
                task &&
                (teamMode
                  ? item.displayId !== task.displayId
                  : item.originalId !== task.originalId),
            ),
          };
          return filteredItems;
        }

        return oldItems;
      });

      // 削除済みタスクの残り数を確認して最後かどうか判定
      const deletedTasks = queryClient.getQueryData<DeletedTask[]>(
        teamMode && teamId ? ["team-deleted-tasks", teamId] : ["deleted-tasks"],
      );
      const isLastTask = deletedTasks ? deletedTasks.length <= 1 : true;

      // TaskScreenの onRestoreAndSelectNext に処理を委譲するため、ここでは何もしない

      // 最後にキャッシュを無効化して最新データを取得（安全なアプローチ）
      if (teamMode && teamId) {
        await queryClient.invalidateQueries({
          queryKey: ["team-deleted-tasks", teamId],
        });
        // チーム削除済みタスク一覧の条件付き強制再取得（アクティブクエリのみ）
        const teamDeletedTasksQueries = queryClient.getQueryCache().findAll({
          queryKey: ["team-deleted-tasks", teamId],
          type: "active",
        });
        if (teamDeletedTasksQueries.length > 0) {
          await queryClient.refetchQueries({
            queryKey: ["team-deleted-tasks", teamId],
          });
        }

        if (boardId) {
          const teamIdString = teamId.toString();
          await queryClient.invalidateQueries({
            queryKey: ["team-board-deleted-items", teamIdString, boardId],
          });
          // ボード削除済みアイテムの条件付き強制再取得（アクティブクエリのみ）
          const boardDeletedItemsQueries = queryClient.getQueryCache().findAll({
            queryKey: ["team-board-deleted-items", teamIdString, boardId],
            type: "active",
          });

          if (boardDeletedItemsQueries.length > 0) {
            await queryClient.refetchQueries({
              queryKey: ["team-board-deleted-items", teamIdString, boardId],
            });
          }
        }
      } else {
        await queryClient.invalidateQueries({ queryKey: ["deleted-tasks"] });
        // 個人削除済みタスク一覧の条件付き強制再取得（アクティブクエリのみ）
        const personalDeletedTasksQueries = queryClient
          .getQueryCache()
          .findAll({
            queryKey: ["deleted-tasks"],
            type: "active",
          });
        if (personalDeletedTasksQueries.length > 0) {
          await queryClient.refetchQueries({ queryKey: ["deleted-tasks"] });
        }

        if (boardId) {
          await queryClient.invalidateQueries({
            queryKey: ["board-deleted-items", boardId],
          });
          const boardDeletedItemsQueries = queryClient.getQueryCache().findAll({
            queryKey: ["board-deleted-items", boardId],
            type: "active",
          });
          if (boardDeletedItemsQueries.length > 0) {
            await queryClient.refetchQueries({
              queryKey: ["board-deleted-items", boardId],
            });
          }
        }
      }
    },
  });

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
                await permanentDeleteTask.mutateAsync(
                  teamMode ? task.displayId : task.originalId,
                );
              }

              // アニメーション状態をリセットしてから蓋を閉じる
              onAnimationChange?.(false);
              setTimeout(() => {
                (
                  window as Window & { closeDeletingLid?: () => void }
                ).closeDeletingLid?.();
              }, 500);
            } catch (error) {
              console.error(`❌ アニメーション完了後の処理でエラー:`, error);
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
    } catch (error) {
      console.error(`❌ 完全削除処理でエラー:`, error);
      onAnimationChange?.(false);
      alert("完全削除に失敗しました。");
    }
  };

  const handleRestore = async () => {
    try {
      // エディターコンテンツを復元アニメーション付きで処理
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
                await restoreTask.mutateAsync(
                  teamMode ? task.displayId : task.originalId,
                );
              }
            } catch (error: any) {
              console.error(`❌ 復元処理でエラー (アニメーション内):`, error);
              console.error("復元エラー詳細:", {
                message: error?.message || "メッセージなし",
                stack: error?.stack || "スタックトレースなし",
                name: error?.name || "エラー名なし",
                originalId: task?.originalId,
              });
              alert("復元に失敗しました。");
              throw error; // エラーを再スロー
            }
          },
          "restore", // 復元処理であることを明示
        );
      } else {
        // アニメーション要素がない場合は通常の処理
        if (task) {
          await restoreTask.mutateAsync(
            teamMode ? task.displayId : task.originalId,
          );
        }
      }
    } catch (error: any) {
      console.error(`❌ 復元処理でエラー:`, error);
      console.error("復元処理エラー詳細:", {
        message: error?.message || "メッセージなし",
        stack: error?.stack || "スタックトレースなし",
        name: error?.name || "エラー名なし",
        originalId: task?.originalId,
        onRestoreAndSelectNext: typeof onRestoreAndSelectNext,
      });
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

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
  teamMode?: boolean;
  teamId?: number;
  boardId?: number;
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
}: UseDeletedTaskActionsProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  // 完全削除用のカスタムミューテーション（onSuccessで次選択を実行）
  const permanentDeleteTask = useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken();

      if (teamMode && teamId) {
        // チームモード: チーム用完全削除API
        const response = await tasksApi.permanentDeleteTeamTask(
          teamId,
          originalId,
          token || undefined,
        );
        return response.json();
      } else {
        // 個人モード: 個人用完全削除API
        const response = await tasksApi.permanentDeleteTask(
          originalId,
          token || undefined,
        );
        return response.json();
      }
    },
    onError: (error) => {
      console.error("permanentDeleteTask ミューテーションエラー:", error);
    },
    onSuccess: async () => {
      console.log(
        `✅ 完全削除成功: task.originalId=${task?.originalId}, teamMode=${teamMode}`,
      );
      // キャッシュを手動更新（削除されたアイテムをすぐに除去）
      if (teamMode && teamId) {
        // チームモード: チーム削除済みタスクキャッシュを更新
        console.log(
          `🔄 チーム削除済みタスクキャッシュ更新: teamId=${teamId}, originalId=${task?.originalId}`,
        );
        queryClient.setQueryData(
          ["team-deleted-tasks", teamId],
          (oldDeletedTasks: DeletedTask[] | undefined) => {
            console.log(
              `📊 更新前チーム削除済みタスク数:`,
              oldDeletedTasks?.length || 0,
            );
            if (!oldDeletedTasks) return [];
            const filteredTasks = oldDeletedTasks.filter(
              (t) => task && t.originalId !== task.originalId,
            );
            console.log(
              `📊 更新後チーム削除済みタスク数:`,
              filteredTasks.length,
            );
            return filteredTasks;
          },
        );
      } else {
        // 個人モード: 個人削除済みタスクキャッシュを更新
        console.log(
          `🔄 個人削除済みタスクキャッシュ更新: originalId=${task?.originalId}`,
        );
        queryClient.setQueryData(
          ["deleted-tasks"],
          (oldDeletedTasks: DeletedTask[] | undefined) => {
            console.log(
              `📊 更新前個人削除済みタスク数:`,
              oldDeletedTasks?.length || 0,
            );
            if (!oldDeletedTasks) return [];
            const filteredTasks = oldDeletedTasks.filter(
              (t) => task && t.originalId !== task.originalId,
            );
            console.log(`📊 更新後個人削除済みタスク数:`, filteredTasks.length);
            return filteredTasks;
          },
        );
      }

      // ボード固有の削除済みアイテムキャッシュも手動更新（teamIdを文字列に統一）
      const boardDeletedItemsQueryKey =
        teamMode && teamId && boardId
          ? ["team-board-deleted-items", teamId.toString(), boardId]
          : ["board-deleted-items", boardId];

      console.log(
        `🔄 ボード削除済みアイテムキャッシュ更新: queryKey=`,
        boardDeletedItemsQueryKey,
      );

      queryClient.setQueryData(boardDeletedItemsQueryKey, (oldItems: any) => {
        console.log(`📊 更新前ボード削除済みアイテム:`, oldItems);
        console.log(
          `🎯 削除対象originalId=${task?.originalId}のアイテムを除去`,
        );

        if (!oldItems) {
          console.log(`⚠️ oldItems is null/undefined - キャッシュ更新スキップ`);
          return null;
        }

        // 削除済みアイテム構造: { memos: [], tasks: [] }
        if (oldItems.tasks) {
          const beforeCount = oldItems.tasks.length;
          const filteredItems = {
            ...oldItems,
            tasks: oldItems.tasks.filter(
              (item: any) => task && item.originalId !== task.originalId,
            ),
          };
          const afterCount = filteredItems.tasks.length;
          console.log(
            `📊 ボードタスクフィルタ: ${beforeCount}件 → ${afterCount}件 (削除=${beforeCount - afterCount}件)`,
          );
          console.log(
            `🎯 更新後ボード削除済みタスク詳細:`,
            filteredItems.tasks.map(
              (t: any) => `originalId=${t.originalId}, title="${t.title}"`,
            ),
          );
          return filteredItems;
        }

        console.log(`⚠️ oldItems.tasks が存在しない - そのまま返却`);
        return oldItems;
      });

      // 即座に次のタスク選択機能を使用（手動更新済みなのでタイミング問題なし）
      if (onDeleteAndSelectNext && task) {
        onDeleteAndSelectNext(task);
      } else {
        onClose();
      }

      // 最後にキャッシュを無効化して最新データを取得（安全なアプローチ）
      console.log(
        `🔄 キャッシュ無効化開始: teamMode=${teamMode}, teamId=${teamId}, boardId=${boardId}`,
      );
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
          console.log(
            `🔄 チーム削除済みタスク強制再取得実行: teamId=${teamId}`,
          );
        } else {
          console.log(
            `⏭️ チーム削除済みタスククエリ非アクティブ - 再取得スキップ: teamId=${teamId}`,
          );
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
            console.log(
              `🔄 ボード削除済みアイテム強制再取得開始: teamId=${teamId}, boardId=${boardId}`,
            );
            await queryClient.refetchQueries({
              queryKey: ["team-board-deleted-items", teamIdString, boardId],
            });
            console.log(
              `✅ ボード削除済みアイテム強制再取得完了: teamId=${teamId}, boardId=${boardId}`,
            );

            // 再取得後のデータ状態も確認
            const afterRefetch = queryClient.getQueryData([
              "team-board-deleted-items",
              teamIdString,
              boardId,
            ]);
            console.log(`🎯 再取得後データ:`, afterRefetch);
          } else {
            console.log(
              `⏭️ ボード削除済みアイテムクエリ非アクティブ - 再取得スキップ: teamId=${teamId}, boardId=${boardId}`,
            );
            console.log(
              `💡 UIが表示されていない可能性があります。ページ再読み込み時に最新データが表示されます。`,
            );
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
          console.log(`🔄 個人削除済みタスク強制再取得実行`);
        } else {
          console.log(
            `⏭️ 個人削除済みタスククエリ非アクティブ - 再取得スキップ`,
          );
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
            console.log(
              `🔄 個人ボード削除済みアイテム強制再取得実行: boardId=${boardId}`,
            );
          } else {
            console.log(
              `⏭️ 個人ボード削除済みアイテムクエリ非アクティブ - 再取得スキップ: boardId=${boardId}`,
            );
          }
        }
      }
      console.log(`✅ キャッシュ無効化完了`);
    },
  });

  // 復元用のカスタムミューテーション（チーム対応）
  const restoreTask = useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken();

      if (teamMode && teamId) {
        // チームモード: チーム用復元API
        console.log(
          `🔄 チームタスク復元開始: teamId=${teamId}, originalId=${originalId}`,
        );
        const response = await tasksApi.restoreTeamTask(
          teamId,
          originalId,
          token || undefined,
        );
        return response.json();
      } else {
        // 個人モード: 個人用復元API
        console.log(`🔄 個人タスク復元開始: originalId=${originalId}`);
        const response = await tasksApi.restoreTask(
          originalId,
          token || undefined,
        );
        return response.json();
      }
    },
    onError: (error) => {
      console.error("restoreTask ミューテーションエラー:", error);
    },
    onSuccess: async (restoredTaskData) => {
      console.log(
        `✅ タスク復元成功: task.originalId=${task?.originalId}, teamMode=${teamMode}`,
        "restoredData:",
        restoredTaskData,
      );

      // 復元されたタスクをボードアイテムキャッシュに楽観的追加
      if (boardId && task) {
        const boardItemsQueryKey =
          teamMode && teamId
            ? ["team-boards", teamId.toString(), boardId, "items"]
            : ["boards", boardId, "items"];

        console.log(
          `🔄 ボードアイテムキャッシュに復元タスクを追加: queryKey=`,
          boardItemsQueryKey,
        );

        queryClient.setQueryData(boardItemsQueryKey, (oldBoardData: any) => {
          if (!oldBoardData || !oldBoardData.items) {
            console.log(`⚠️ ボードデータなし - 楽観的更新スキップ`);
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
          console.log(
            `📊 ボードアイテム追加: ${oldBoardData.items.length}件 → ${updatedItems.length}件`,
          );

          return {
            ...oldBoardData,
            items: updatedItems,
          };
        });
      }

      // キャッシュを手動更新（復元されたアイテムをすぐに除去）
      if (teamMode && teamId) {
        // チームモード: チーム削除済みタスクキャッシュを更新
        console.log(
          `🔄 チーム削除済みタスクキャッシュ更新（復元）: teamId=${teamId}, originalId=${task?.originalId}`,
        );
        queryClient.setQueryData(
          ["team-deleted-tasks", teamId],
          (oldDeletedTasks: DeletedTask[] | undefined) => {
            console.log(
              `📊 復元前チーム削除済みタスク数:`,
              oldDeletedTasks?.length || 0,
            );
            if (!oldDeletedTasks) return [];
            const filteredTasks = oldDeletedTasks.filter(
              (t) => task && t.originalId !== task.originalId,
            );
            console.log(
              `📊 復元後チーム削除済みタスク数:`,
              filteredTasks.length,
            );
            return filteredTasks;
          },
        );
      } else {
        // 個人モード: 個人削除済みタスクキャッシュを更新
        console.log(
          `🔄 個人削除済みタスクキャッシュ更新（復元）: originalId=${task?.originalId}`,
        );
        queryClient.setQueryData(
          ["deleted-tasks"],
          (oldDeletedTasks: DeletedTask[] | undefined) => {
            console.log(
              `📊 復元前個人削除済みタスク数:`,
              oldDeletedTasks?.length || 0,
            );
            if (!oldDeletedTasks) return [];
            const filteredTasks = oldDeletedTasks.filter(
              (t) => task && t.originalId !== task.originalId,
            );
            console.log(`📊 復元後個人削除済みタスク数:`, filteredTasks.length);
            return filteredTasks;
          },
        );
      }

      // ボード固有の削除済みアイテムキャッシュも手動更新（teamIdを文字列に統一）
      const boardDeletedItemsQueryKey =
        teamMode && teamId && boardId
          ? ["team-board-deleted-items", teamId.toString(), boardId]
          : ["board-deleted-items", boardId];

      console.log(
        `🔄 ボード削除済みアイテムキャッシュ更新（復元）: queryKey=`,
        boardDeletedItemsQueryKey,
      );

      queryClient.setQueryData(boardDeletedItemsQueryKey, (oldItems: any) => {
        console.log(`📊 復元前ボード削除済みアイテム:`, oldItems);
        console.log(
          `🎯 復元対象originalId=${task?.originalId}のアイテムを除去`,
        );

        if (!oldItems) {
          console.log(`⚠️ oldItems is null/undefined - キャッシュ更新スキップ`);
          return null;
        }

        // 削除済みアイテム構造: { memos: [], tasks: [] }
        if (oldItems.tasks) {
          const beforeCount = oldItems.tasks.length;
          const filteredItems = {
            ...oldItems,
            tasks: oldItems.tasks.filter(
              (item: any) => task && item.originalId !== task.originalId,
            ),
          };
          const afterCount = filteredItems.tasks.length;
          console.log(
            `📊 ボードタスクフィルタ（復元）: ${beforeCount}件 → ${afterCount}件 (除去=${beforeCount - afterCount}件)`,
          );
          console.log(
            `🎯 復元後ボード削除済みタスク詳細:`,
            filteredItems.tasks.map(
              (t: any) => `originalId=${t.originalId}, title="${t.title}"`,
            ),
          );
          return filteredItems;
        }

        console.log(`⚠️ oldItems.tasks が存在しない - そのまま返却`);
        return oldItems;
      });

      // 即座に次のタスク選択機能を使用（手動更新済みなのでタイミング問題なし）
      if (onRestoreAndSelectNext && task) {
        onRestoreAndSelectNext(task);
      } else {
        onClose();
      }

      // 最後にキャッシュを無効化して最新データを取得（安全なアプローチ）
      console.log(
        `🔄 復元後キャッシュ無効化開始: teamMode=${teamMode}, teamId=${teamId}, boardId=${boardId}`,
      );
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
          console.log(
            `🔄 チーム削除済みタスク強制再取得実行（復元）: teamId=${teamId}`,
          );
        } else {
          console.log(
            `⏭️ チーム削除済みタスククエリ非アクティブ - 再取得スキップ（復元）: teamId=${teamId}`,
          );
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
            console.log(
              `🔄 ボード削除済みアイテム強制再取得開始（復元）: teamId=${teamId}, boardId=${boardId}`,
            );
            await queryClient.refetchQueries({
              queryKey: ["team-board-deleted-items", teamIdString, boardId],
            });
            console.log(
              `✅ ボード削除済みアイテム強制再取得完了（復元）: teamId=${teamId}, boardId=${boardId}`,
            );

            // 再取得後のデータ状態も確認
            const afterRefetch = queryClient.getQueryData([
              "team-board-deleted-items",
              teamIdString,
              boardId,
            ]);
            console.log(`🎯 再取得後データ（復元）:`, afterRefetch);
          } else {
            console.log(
              `⏭️ ボード削除済みアイテムクエリ非アクティブ - 再取得スキップ（復元）: teamId=${teamId}, boardId=${boardId}`,
            );
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
          console.log(`🔄 個人削除済みタスク強制再取得実行（復元）`);
        } else {
          console.log(
            `⏭️ 個人削除済みタスククエリ非アクティブ - 再取得スキップ（復元）`,
          );
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
            console.log(
              `🔄 個人ボード削除済みアイテム強制再取得実行（復元）: boardId=${boardId}`,
            );
          } else {
            console.log(
              `⏭️ 個人ボード削除済みアイテムクエリ非アクティブ - 再取得スキップ（復元）: boardId=${boardId}`,
            );
          }
        }
      }
      console.log(`✅ 復元後キャッシュ無効化完了`);
    },
  });

  const handlePermanentDelete = async () => {
    try {
      console.log(
        `🗑️ 完全削除処理開始: task.originalId=${task?.originalId}, teamMode=${teamMode}, teamId=${teamId}`,
      );
      setShowDeleteModal(false);

      // エディターコンテンツをゴミ箱に吸い込むアニメーション
      const editorArea = document.querySelector(
        "[data-task-editor]",
      ) as HTMLElement;
      const rightTrashButton = document.querySelector(
        "[data-right-panel-trash]",
      ) as HTMLElement;

      if (editorArea && rightTrashButton) {
        console.log(`🎬 アニメーション要素発見 - アニメーション実行開始`);
        const { animateEditorContentToTrashCSS } = await import(
          "@/src/utils/deleteAnimation"
        );
        animateEditorContentToTrashCSS(
          editorArea,
          rightTrashButton,
          async () => {
            // アニメーション完了後の処理
            try {
              console.log(
                `🎬 アニメーション完了 - API実行開始: originalId=${task?.originalId}`,
              );
              // API実行（onSuccessで次選択とキャッシュ更新が実行される）
              if (task) {
                await permanentDeleteTask.mutateAsync(task.originalId);
                console.log(`✅ API実行完了: originalId=${task.originalId}`);
              }

              // アニメーション状態をリセットしてから蓋を閉じる
              console.log(`🎬 アニメーション状態リセット開始`);
              onAnimationChange?.(false);
              setTimeout(() => {
                (
                  window as Window & { closeDeletingLid?: () => void }
                ).closeDeletingLid?.();
                console.log(`🎬 削除蓋クローズ実行完了`);
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
        console.log(`⚠️ アニメーション要素が見つからない - 直接API実行`);

        // API実行（onSuccessで次選択とキャッシュ更新が実行される）
        if (task) {
          console.log(`🚀 直接API実行開始: originalId=${task.originalId}`);
          await permanentDeleteTask.mutateAsync(task.originalId);
          console.log(`✅ 直接API実行完了: originalId=${task.originalId}`);
        }

        // アニメーション状態をリセットしてから蓋を閉じる
        console.log(`🎬 アニメーション状態リセット開始（直接実行）`);
        onAnimationChange?.(false);
        setTimeout(() => {
          (
            window as Window & { closeDeletingLid?: () => void }
          ).closeDeletingLid?.();
          console.log(`🎬 削除蓋クローズ実行完了（直接実行）`);
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
      console.log(
        `🔄 復元処理開始: task.originalId=${task?.originalId}, teamMode=${teamMode}, teamId=${teamId}`,
      );

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
                console.log(
                  `🚀 復元API実行開始: originalId=${task.originalId}`,
                );
                await restoreTask.mutateAsync(task.originalId);
                console.log(
                  `✅ 復元API実行完了: originalId=${task.originalId}`,
                );
              }
            } catch (error) {
              console.error(`❌ 復元処理でエラー (アニメーション内):`, error);
              alert("復元に失敗しました。");
            }
          },
          "restore", // 復元処理であることを明示
        );
      } else {
        // アニメーション要素がない場合は通常の処理
        if (task) {
          console.log(`🚀 復元API実行開始: originalId=${task.originalId}`);
          await restoreTask.mutateAsync(task.originalId);
          console.log(`✅ 復元API実行完了: originalId=${task.originalId}`);
        }
      }
    } catch (error) {
      console.error(`❌ 復元処理でエラー:`, error);
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

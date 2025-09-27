import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { tasksApi } from "@/src/lib/api-client";
import type {
  Task,
  DeletedTask,
  CreateTaskData,
  UpdateTaskData,
} from "@/src/types/task";
import { useToast } from "@/src/contexts/toast-context";

// グローバル削除処理追跡（重複削除防止）- タスク用
const activeTaskDeleteOperations = new Set<string>();

function getTaskDeletionKey(id: number, teamId?: number): string {
  return teamId ? `team-${teamId}-task-${id}` : `task-${id}`;
}

// タスク一覧を取得するhook
export function useTasks(options?: { teamMode?: boolean; teamId?: number }) {
  const { getToken } = useAuth();
  const { teamMode = false, teamId } = options || {};

  return useQuery<Task[]>(
    teamMode ? ["team-tasks", teamId] : ["tasks"],
    async () => {
      const token = await getToken();
      if (teamMode && teamId) {
        // チーム用のAPIエンドポイント
        const response = await tasksApi.getTeamTasks(
          teamId,
          token || undefined,
        );
        const data = await response.json();
        return data as Task[];
      } else {
        const response = await tasksApi.getTasks(token || undefined);
        const data = await response.json();
        return data as Task[];
      }
    },
    {
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      enabled: teamMode ? Boolean(teamId) : true,
    },
  );
}

// タスク作成hook
export function useCreateTask(options?: {
  teamMode?: boolean;
  teamId?: number;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { teamMode = false, teamId } = options || {};

  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      const token = await getToken();
      if (teamMode && teamId) {
        // チーム用のAPIエンドポイント
        const response = await tasksApi.createTeamTask(
          teamId,
          data,
          token || undefined,
        );
        const result = await response.json();
        return result;
      } else {
        const response = await tasksApi.createTask(data, token || undefined);
        const result = await response.json();
        return result;
      }
    },
    onSuccess: (newTask) => {
      // APIが不完全なデータしか返さないため、タスク一覧を無効化して再取得
      if (teamMode && teamId) {
        queryClient.invalidateQueries({ queryKey: ["team-tasks", teamId] });

        // チームタスク一覧に新しいタスクを楽観的に追加
        queryClient.setQueryData<Task[]>(["team-tasks", teamId], (oldTasks) => {
          if (!oldTasks) return [newTask];
          return [...oldTasks, newTask];
        });

        // チーム掲示板キャッシュを楽観的更新（空表示を避けるため）

        // 既存のボードアイテムキャッシュに新しいタスクを即座に追加
        const boardId = 1; // 仮値（実際はinitialBoardIdから取得すべき）
        queryClient.setQueryData(
          ["team-boards", teamId.toString(), boardId, "items"],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (oldData: any) => {
            if (oldData?.items) {
              return {
                ...oldData,
                items: [
                  ...oldData.items,
                  {
                    id: newTask.id,
                    boardId: 1, // 仮で設定、実際のボードIDは後でAPIから取得
                    itemId: newTask.originalId || newTask.id.toString(),
                    itemType: "task",
                    content: newTask,
                    createdAt: newTask.createdAt,
                    updatedAt: newTask.updatedAt,
                    position: oldData.items.length,
                  },
                ],
              };
            }
            return oldData;
          },
        );

        // バックグラウンドでデータを再取得（楽観的更新の検証）
        setTimeout(() => {
          queryClient.refetchQueries({
            predicate: (query) => {
              const key = query.queryKey as string[];
              return key[0] === "team-boards" && key[1] === teamId.toString();
            },
          });
        }, 1000);
      } else {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });

        // 個人タスクのキャッシュを更新
        queryClient.setQueryData<Task[]>(["tasks"], (oldTasks) => {
          if (!oldTasks) return [newTask];
          return [...oldTasks, newTask];
        });
      }

      // ボード統計の再計算のためボード一覧を無効化
      queryClient.invalidateQueries({ queryKey: ["boards"] });
    },
    onError: (error) => {
      console.error("タスク作成に失敗しました:", error);
      showToast("タスク作成に失敗しました", "error");
    },
  });
}

// タスク更新hook
export function useUpdateTask(options?: {
  teamMode?: boolean;
  teamId?: number;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { teamMode = false, teamId } = options || {};

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTaskData }) => {
      const token = await getToken();
      if (teamMode && teamId) {
        // チーム用のAPIエンドポイント
        const response = await tasksApi.updateTeamTask(
          teamId,
          id,
          data,
          token || undefined,
        );
        const result = await response.json();
        return result;
      } else {
        const response = await tasksApi.updateTask(
          id,
          data,
          token || undefined,
        );
        const result = await response.json();
        return result;
      }
    },
    onSuccess: (updatedTask, { id, data }) => {
      // APIが不完全なレスポンスを返す場合があるので、キャッシュから既存タスクを取得して更新
      const queryKey = teamMode && teamId ? ["team-tasks", teamId] : ["tasks"];
      queryClient.setQueryData<Task[]>(queryKey, (oldTasks) => {
        if (!oldTasks) return [updatedTask];
        return oldTasks.map((task) => {
          if (task.id === id) {
            // APIが完全なタスクオブジェクトを返した場合はそれを使用
            if (
              updatedTask.title !== undefined &&
              updatedTask.description !== undefined
            ) {
              return updatedTask;
            }
            // APIが不完全な場合は既存タスクを更新データでマージ
            return {
              ...task,
              title: data.title ?? task.title,
              description: data.description ?? task.description,
              status: data.status ?? task.status,
              priority: data.priority ?? task.priority,
              dueDate: data.dueDate ?? task.dueDate,
              updatedAt: Math.floor(Date.now() / 1000),
            };
          }
          return task;
        });
      });
      // ボード関連キャッシュを無効化（一覧・統計・アイテムを含む）
      queryClient.invalidateQueries({
        queryKey: ["boards"],
        exact: false,
      });
    },
    onError: (error) => {
      console.error("タスク更新に失敗しました:", error);
      showToast("タスク更新に失敗しました", "error");
    },
  });
}

// タスク削除hook
export function useDeleteTask(options?: {
  teamMode?: boolean;
  teamId?: number;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { teamMode = false, teamId } = options || {};

  return useMutation({
    retry: false, // 重複実行防止：リトライ無効化
    mutationFn: async (id: number) => {
      const deletionKey = getTaskDeletionKey(id, teamId);

      // 重複削除チェック
      if (activeTaskDeleteOperations.has(deletionKey)) {
        console.warn(`⚠️ タスク削除処理実行中のためスキップ: ${deletionKey}`);
        throw new Error("タスク削除処理実行中");
      }

      // 削除処理開始を記録
      activeTaskDeleteOperations.add(deletionKey);
      console.log(`🗑️ タスク削除処理開始: ${deletionKey}`);

      try {
        const token = await getToken();

        // 削除前チェック: キャッシュ内にタスクが存在するか確認
        const currentTasks =
          teamMode && teamId
            ? queryClient.getQueryData<Task[]>(["team-tasks", teamId])
            : queryClient.getQueryData<Task[]>(["tasks"]);

        const taskExists = currentTasks?.some((task) => task.id === id);

        if (!taskExists) {
          throw new Error(
            `タスク(ID: ${id})は既に削除済みまたは存在しません。`,
          );
        }

        if (teamMode && teamId) {
          // チームタスク削除
          const response = await tasksApi.deleteTeamTask(
            teamId,
            id,
            token || undefined,
          );
          const result = await response.json();
          return result;
        } else {
          // 個人タスク削除
          const response = await tasksApi.deleteTask(id, token || undefined);
          const result = await response.json();
          return result;
        }
      } finally {
        // 削除処理完了を記録（成功・失敗関係なく）
        activeTaskDeleteOperations.delete(deletionKey);
        console.log(`✅ タスク削除処理完了: ${deletionKey}`);
      }
    },
    onSuccess: async (_, id) => {
      if (teamMode && teamId) {
        // チームタスク一覧から削除されたタスクを楽観的更新で即座に除去
        const deletedTask = queryClient
          .getQueryData<Task[]>(["team-tasks", teamId])
          ?.find((task) => task.id === id);

        queryClient.setQueryData<Task[]>(["team-tasks", teamId], (oldTasks) => {
          if (!oldTasks) return [];
          return oldTasks.filter((task) => task.id !== id);
        });

        // 削除済み一覧に楽観的更新で即座に追加（メモと同じ実装）
        if (deletedTask) {
          console.log("🗑️ チーム削除済み一覧に楽観的更新で追加", {
            taskId: id,
            taskOriginalId: deletedTask.originalId,
            taskTitle: deletedTask.title,
            teamId,
            時刻: new Date().toISOString(),
          });

          const deletedTaskWithDeletedAt = {
            ...deletedTask,
            originalId: deletedTask.originalId || id.toString(),
            deletedAt: Date.now(), // Unix timestamp形式
          };

          queryClient.setQueryData<DeletedTask[]>(
            ["team-deleted-tasks", teamId],
            (oldDeletedTasks) => {
              if (!oldDeletedTasks) return [deletedTaskWithDeletedAt];
              // 重複チェック
              const exists = oldDeletedTasks.some(
                (t) => t.originalId === deletedTaskWithDeletedAt.originalId,
              );
              if (exists) {
                console.log(
                  "⚠️ チーム削除済み一覧に既に存在するためスキップ",
                  deletedTaskWithDeletedAt.originalId,
                );
                return oldDeletedTasks;
              }
              return [deletedTaskWithDeletedAt, ...oldDeletedTasks];
            },
          );
        }

        // 削除済み一覧もバックグラウンドで無効化（安全性のため）
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-deleted-tasks" && key[1] === teamId?.toString()
            );
          },
        });
        // チームボード関連のキャッシュを強制再取得（統計が変わるため）
        queryClient.refetchQueries({
          queryKey: ["team-boards", teamId],
        });
        // ボードアイテムキャッシュを強制再取得（UIからも削除するため）
        queryClient.refetchQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-boards" &&
              key[1] === teamId.toString() &&
              key[3] === "items"
            );
          },
        });
      } else {
        // 個人タスク一覧から削除されたタスクを楽観的更新で即座に除去
        const deletedTask = queryClient
          .getQueryData<Task[]>(["tasks"])
          ?.find((task) => task.id === id);

        queryClient.setQueryData<Task[]>(["tasks"], (oldTasks) => {
          if (!oldTasks) return [];
          return oldTasks.filter((task) => task.id !== id);
        });

        // 削除済み一覧に楽観的更新で即座に追加（メモと同じ実装）
        if (deletedTask) {
          console.log("🗑️ 個人削除済み一覧に楽観的更新で追加", {
            taskId: id,
            taskOriginalId: deletedTask.originalId,
            taskTitle: deletedTask.title,
            時刻: new Date().toISOString(),
          });

          const deletedTaskWithDeletedAt = {
            ...deletedTask,
            originalId: deletedTask.originalId || id.toString(),
            deletedAt: Date.now(), // Unix timestamp形式
          };

          queryClient.setQueryData<DeletedTask[]>(
            ["deleted-tasks"],
            (oldDeletedTasks) => {
              if (!oldDeletedTasks) return [deletedTaskWithDeletedAt];
              // 重複チェック
              const exists = oldDeletedTasks.some(
                (t) => t.originalId === deletedTaskWithDeletedAt.originalId,
              );
              if (exists) {
                console.log(
                  "⚠️ 個人削除済み一覧に既に存在するためスキップ",
                  deletedTaskWithDeletedAt.originalId,
                );
                return oldDeletedTasks;
              }
              return [deletedTaskWithDeletedAt, ...oldDeletedTasks];
            },
          );
        }

        // 削除済み一覧もバックグラウンドで無効化（安全性のため）
        queryClient.invalidateQueries({ queryKey: ["deleted-tasks"] });
        // ボード関連のキャッシュを強制再取得（統計が変わるため）
        queryClient.refetchQueries({ queryKey: ["boards"] });
      }

      // 全タグ付け情報を無効化（削除されたタスクに関連するタグ情報が変わる可能性があるため）
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
    },
    onError: (error) => {
      const errorObj = error as Error;
      console.error("❌ タスク削除エラー詳細:", {
        message: errorObj.message,
        name: errorObj.name,
        stack: errorObj.stack,
        cause: errorObj.cause,
        fullError: error,
      });

      // エラーメッセージをより詳しく表示
      const errorMessage =
        errorObj.message || errorObj.toString() || "不明なエラー";
      console.error("❌ タスク削除失敗:", errorMessage);
      showToast(`タスク削除に失敗しました: ${errorMessage}`, "error");
    },
  });
}

// 削除済みタスク一覧を取得するhook
export function useDeletedTasks(options?: {
  teamMode?: boolean;
  teamId?: number;
}) {
  const { getToken } = useAuth();
  const { teamMode = false, teamId } = options || {};

  return useQuery<DeletedTask[]>(
    teamMode ? ["team-deleted-tasks", teamId] : ["deleted-tasks"],
    async () => {
      const token = await getToken();
      if (teamMode && teamId) {
        // チーム用のAPIエンドポイント
        const response = await tasksApi.getDeletedTeamTasks(
          teamId,
          token || undefined,
        );
        const data = await response.json();
        return data as DeletedTask[];
      } else {
        const response = await tasksApi.getDeletedTasks(token || undefined);
        const data = await response.json();
        return data as DeletedTask[];
      }
    },
    {
      staleTime: 2 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      enabled: teamMode ? Boolean(teamId) : true,
    },
  );
}

// タスク完全削除hook
export function usePermanentDeleteTask() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken();
      const response = await tasksApi.permanentDeleteTask(
        originalId,
        token || undefined,
      );
      const result = await response.json();
      return result;
    },
    onSuccess: (_, originalId) => {
      // 削除済み一覧から完全削除されたタスクを除去
      queryClient.setQueryData<DeletedTask[]>(
        ["deleted-tasks"],
        (oldDeletedTasks) => {
          if (!oldDeletedTasks) return [];
          return oldDeletedTasks.filter(
            (task) => task.originalId !== originalId,
          );
        },
      );
    },
    onError: (error) => {
      console.error("タスクの完全削除に失敗しました:", error);
      showToast("タスクの完全削除に失敗しました", "error");
    },
  });
}

// タスク復元hook
export function useRestoreTask(options?: {
  teamMode?: boolean;
  teamId?: number;
  boardId?: number;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { teamMode = false, teamId, boardId } = options || {};

  return useMutation({
    mutationFn: async (originalId: string) => {
      console.log("🔧 React Query: タスク復元mutationFn開始", {
        originalId,
        teamMode,
        teamId,
        timestamp: new Date().toISOString(),
        stackTrace: new Error().stack?.split("\n").slice(1, 3),
      });

      const token = await getToken();

      if (teamMode && teamId) {
        // チームタスク復元
        const response = await tasksApi.restoreTeamTask(
          teamId,
          originalId,
          token || undefined,
        );
        const result = await response.json();
        return result;
      } else {
        // 個人タスク復元
        console.log("📞 個人タスク復元API呼び出し", { originalId });
        const response = await tasksApi.restoreTask(
          originalId,
          token || undefined,
        );
        const result = await response.json();
        console.log("✅ 個人タスク復元API完了", { originalId, result });
        return result;
      }
    },
    onSuccess: (restoredTaskData, originalId) => {
      if (teamMode && teamId) {
        // チーム削除済みタスク一覧から復元されたタスクを楽観的更新で即座に除去
        const deletedTask = queryClient
          .getQueryData<DeletedTask[]>(["team-deleted-tasks", teamId])
          ?.find((task) => task.originalId === originalId);

        queryClient.setQueryData<DeletedTask[]>(
          ["team-deleted-tasks", teamId],
          (oldDeletedTasks) => {
            if (!oldDeletedTasks) return [];
            return oldDeletedTasks.filter(
              (task) => task.originalId !== originalId,
            );
          },
        );

        // チーム通常タスク一覧に復元されたタスクを楽観的更新で追加（削除時の逆操作）
        if (deletedTask && restoredTaskData) {
          console.log("🔄 チーム通常一覧に楽観的更新で追加", {
            taskId: deletedTask.id,
            taskOriginalId: originalId,
            taskTitle: deletedTask.title,
            teamId,
            時刻: new Date().toISOString(),
          });

          // 復元されたタスクデータを使用（deletedAtを除去）
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { deletedAt: _deletedAt, ...restoredTask } = deletedTask;
          queryClient.setQueryData<Task[]>(
            ["team-tasks", teamId],
            (oldTasks) => {
              if (!oldTasks) return [restoredTask as Task];
              // 重複チェック
              const exists = oldTasks.some(
                (t) => t.originalId === restoredTask.originalId,
              );
              if (exists) {
                console.log(
                  "⚠️ チーム通常一覧に既に存在するためスキップ",
                  restoredTask.originalId,
                );
                return oldTasks;
              }
              return [restoredTask as Task, ...oldTasks];
            },
          );
        }

        // バックグラウンドで安全性のため無効化・再取得
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "team-deleted-tasks" && key[1] === teamId?.toString()
            );
          },
        });
        queryClient.refetchQueries({ queryKey: ["team-tasks", teamId] });

        // チームボード関連のキャッシュを無効化と強制再取得
        queryClient.invalidateQueries({
          queryKey: ["team-boards", teamId.toString()],
          exact: false,
        });
        queryClient.invalidateQueries({
          queryKey: ["team-board-deleted-items", teamId.toString()],
          exact: false,
        });
        // 特定のボードの削除済みアイテムも明示的に無効化
        if (boardId) {
          queryClient.invalidateQueries({
            queryKey: ["team-board-deleted-items", teamId.toString(), boardId],
          });
          queryClient.refetchQueries({
            queryKey: ["team-board-deleted-items", teamId.toString(), boardId],
          });
        }

        // ボードアイテムの強制再取得（復元したタスクが表示されるように）
        queryClient.refetchQueries({
          queryKey: ["team-boards", teamId.toString()],
          exact: false,
        });
      } else {
        // 個人削除済みタスク一覧から復元されたタスクを楽観的更新で即座に除去
        const deletedTask = queryClient
          .getQueryData<DeletedTask[]>(["deleted-tasks"])
          ?.find((task) => task.originalId === originalId);

        queryClient.setQueryData<DeletedTask[]>(
          ["deleted-tasks"],
          (oldDeletedTasks) => {
            if (!oldDeletedTasks) return [];
            return oldDeletedTasks.filter(
              (task) => task.originalId !== originalId,
            );
          },
        );

        // 個人通常タスク一覧に復元されたタスクを楽観的更新で追加（削除時の逆操作）
        if (deletedTask && restoredTaskData) {
          console.log("🔄 個人通常一覧に楽観的更新で追加", {
            taskId: deletedTask.id,
            taskOriginalId: originalId,
            taskTitle: deletedTask.title,
            時刻: new Date().toISOString(),
          });

          // 復元されたタスクデータを使用（deletedAtを除去）
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { deletedAt: _deletedAt, ...restoredTask } = deletedTask;
          queryClient.setQueryData<Task[]>(["tasks"], (oldTasks) => {
            if (!oldTasks) return [restoredTask as Task];
            // 重複チェック
            const exists = oldTasks.some(
              (t) => t.originalId === restoredTask.originalId,
            );
            if (exists) {
              console.log(
                "⚠️ 個人通常一覧に既に存在するためスキップ",
                restoredTask.originalId,
              );
              return oldTasks;
            }
            return [restoredTask as Task, ...oldTasks];
          });
        }

        // バックグラウンドで安全性のため無効化・再取得
        queryClient.invalidateQueries({ queryKey: ["deleted-tasks"] });
        queryClient.refetchQueries({ queryKey: ["tasks"] });

        // ボード関連のキャッシュを無効化と強制再取得
        queryClient.invalidateQueries({ queryKey: ["boards"], exact: false });
        queryClient.invalidateQueries({
          queryKey: ["board-deleted-items"],
          exact: false,
        });
        queryClient.refetchQueries({ queryKey: ["boards"], exact: false });
      }
      // 全タグ付け情報を無効化（復元されたタスクのタグ情報が変わる可能性があるため）
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
      // showToast("タスクを復元しました", "success"); // トースト通知は無効化
    },
    onError: (error) => {
      console.error("タスク復元に失敗しました:", error);
      showToast("タスク復元に失敗しました", "error");
    },
  });
}

// CSVインポートhook
export function useImportTasks() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const token = await getToken();
      const response = await tasksApi.importTasks(file, token || undefined);
      const data = await response.json();
      return data as { success: boolean; imported: number; errors: string[] };
    },
    onSuccess: () => {
      // CSVインポートは大量データの可能性があるため一覧を無効化
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (error) => {
      console.error("タスクのCSVインポートに失敗しました:", error);
      showToast("タスクのCSVインポートに失敗しました", "error");
    },
  });
}

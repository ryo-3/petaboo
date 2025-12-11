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
import { updateItemCache } from "@/src/lib/cache-utils";

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
      enabled: teamMode ? Boolean(teamId) : true,
      // 個人モード: setQueryDataで更新するためAPI再取得不要
      // チームモード: 他メンバーの変更取得のため短めのstaleTime
      staleTime: teamMode ? 30 * 1000 : Infinity,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: teamMode ? true : false,
      keepPreviousData: true,
      ...(teamMode &&
        teamId && {
          refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得
          refetchIntervalInBackground: true,
        }),
    },
  );
}

// タスク作成hook
export function useCreateTask(options?: {
  teamMode?: boolean;
  teamId?: number;
  boardId?: number; // チームボードキャッシュ更新用
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { teamMode = false, teamId, boardId } = options || {};

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
      if (teamMode && teamId) {
        // チームモード: 既存のキャッシュ更新ロジックを維持（Step 2で対応）
        const existingCache = queryClient.getQueryData<Task[]>([
          "team-tasks",
          teamId,
        ]);
        if (existingCache) {
          queryClient.setQueryData<Task[]>(
            ["team-tasks", teamId],
            (oldTasks) => {
              if (!oldTasks) return [newTask];
              const exists = oldTasks.some(
                (t) => t.displayId === newTask.displayId,
              );
              if (exists) return oldTasks;
              return [...oldTasks, newTask];
            },
          );
        }
      } else {
        // 個人モード: updateItemCacheで統一管理
        updateItemCache({
          queryClient,
          itemType: "task",
          operation: "create",
          item: newTask,
          boardId,
        });
      }
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
  boardId?: number; // チームボードキャッシュ更新用
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { teamMode = false, teamId, boardId } = options || {};

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

        // 409 Conflict: 楽観的ロックによる競合検出
        if (response.status === 409) {
          const errorData = await response.json();
          const error = new Error("Conflict") as Error & {
            status: number;
            latestData?: Task;
          };
          error.status = 409;
          error.latestData = errorData.latestData;
          throw error;
        }

        if (!response.ok) {
          throw new Error("Failed to update team task");
        }

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
            const merged = {
              ...task,
              title: data.title !== undefined ? data.title : task.title,
              description:
                data.description !== undefined
                  ? data.description
                  : task.description,
              status: data.status !== undefined ? data.status : task.status,
              priority:
                data.priority !== undefined ? data.priority : task.priority,
              dueDate: data.dueDate !== undefined ? data.dueDate : task.dueDate,
              assigneeId:
                data.assigneeId !== undefined
                  ? (data.assigneeId ?? null)
                  : (task.assigneeId ?? null),
              assigneeName:
                updatedTask.assigneeName !== undefined
                  ? updatedTask.assigneeName
                  : (task.assigneeName ?? null),
              assigneeAvatarColor:
                updatedTask.assigneeAvatarColor !== undefined
                  ? updatedTask.assigneeAvatarColor
                  : (task.assigneeAvatarColor ?? null),
              categoryId:
                data.categoryId !== undefined
                  ? (data.categoryId ?? null)
                  : (task.categoryId ?? null),
              boardCategoryId:
                data.boardCategoryId !== undefined
                  ? (data.boardCategoryId ?? null)
                  : (task.boardCategoryId ?? null),
              updatedAt: Math.floor(Date.now() / 1000),
            };
            return merged;
          }
          return task;
        });
      });

      // チームボードアイテムキャッシュも楽観的更新（チーム＋ボードID指定時）
      if (teamMode && teamId && boardId) {
        queryClient.setQueryData(
          ["team-boards", teamId.toString(), boardId, "items"],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (oldData: any) => {
            if (oldData?.items) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const updatedItems = oldData.items.map((item: any) => {
                if (item.itemType === "task" && item.content?.id === id) {
                  return {
                    ...item,
                    content: {
                      ...item.content,
                      title:
                        data.title !== undefined
                          ? data.title
                          : item.content.title,
                      description:
                        data.description !== undefined
                          ? data.description
                          : item.content.description,
                      status:
                        data.status !== undefined
                          ? data.status
                          : item.content.status,
                      priority:
                        data.priority !== undefined
                          ? data.priority
                          : item.content.priority,
                      dueDate:
                        data.dueDate !== undefined
                          ? data.dueDate
                          : item.content.dueDate,
                      assigneeId:
                        data.assigneeId !== undefined
                          ? (data.assigneeId ?? null)
                          : (item.content.assigneeId ?? null),
                      assigneeName:
                        updatedTask.assigneeName !== undefined
                          ? updatedTask.assigneeName
                          : (item.content.assigneeName ?? null),
                      assigneeAvatarColor:
                        updatedTask.assigneeAvatarColor !== undefined
                          ? updatedTask.assigneeAvatarColor
                          : (item.content.assigneeAvatarColor ?? null),
                      categoryId:
                        data.categoryId !== undefined
                          ? (data.categoryId ?? null)
                          : (item.content.categoryId ?? null),
                      boardCategoryId:
                        data.boardCategoryId !== undefined
                          ? (data.boardCategoryId ?? null)
                          : (item.content.boardCategoryId ?? null),
                      updatedAt: Math.floor(Date.now() / 1000),
                    },
                    updatedAt: Math.floor(Date.now() / 1000),
                  };
                }
                return item;
              });
              return {
                ...oldData,
                items: updatedItems,
              };
            }
            return oldData;
          },
        );
      }

      // PETABOO-55: setQueryDataで楽観的更新済みなので、ボード全体の無効化は不要
      // ボード詳細のアイテムキャッシュは上で既に更新済み
    },
    onError: (error: Error & { status?: number; latestData?: Task }) => {
      if (error.status === 409 && error.latestData) {
        // 競合エラー: 最新データでキャッシュを更新
        showToast(
          "他のメンバーが変更しました。最新の内容を表示します。",
          "warning",
          5000,
        );
        updateItemCache({
          queryClient,
          itemType: "task",
          operation: "update",
          item: error.latestData,
          teamId,
        });
      } else {
        console.error("タスク更新に失敗しました:", error);
        showToast("タスク更新に失敗しました", "error");
      }
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
        throw new Error("タスク削除処理実行中");
      }

      // 削除処理開始を記録
      activeTaskDeleteOperations.add(deletionKey);

      try {
        const token = await getToken();

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
      }
    },
    onSuccess: async (_, id) => {
      if (teamMode && teamId) {
        // チームモード: 既存のキャッシュ更新ロジックを維持（Step 2で対応）
        const deletedTask = queryClient
          .getQueryData<Task[]>(["team-tasks", teamId])
          ?.find((task) => task.id === id);

        queryClient.setQueryData<Task[]>(["team-tasks", teamId], (oldTasks) => {
          if (!oldTasks) return [];
          return oldTasks.filter((task) => task.id !== id);
        });

        if (deletedTask) {
          const deletedTaskWithDeletedAt = {
            ...deletedTask,
            displayId: deletedTask.displayId || id.toString(),
            deletedAt: Date.now(),
          };

          queryClient.setQueryData<DeletedTask[]>(
            ["team-deleted-tasks", teamId],
            (oldDeletedTasks) => {
              if (!oldDeletedTasks) return [deletedTaskWithDeletedAt];
              const exists = oldDeletedTasks.some(
                (t) => t.displayId === deletedTaskWithDeletedAt.displayId,
              );
              if (exists) return oldDeletedTasks;
              return [deletedTaskWithDeletedAt, ...oldDeletedTasks];
            },
          );
        }
      } else {
        // 個人モード: updateItemCacheで統一管理
        const deletedTask = queryClient
          .getQueryData<Task[]>(["tasks"])
          ?.find((task) => task.id === id);

        if (deletedTask) {
          updateItemCache({
            queryClient,
            itemType: "task",
            operation: "delete",
            item: deletedTask,
          });
        }
      }
    },
    onError: (error) => {
      const errorObj = error as Error;
      const errorMessage =
        errorObj.message || errorObj.toString() || "不明なエラー";
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
      enabled: teamMode ? Boolean(teamId) : true,
      // 個人モード: setQueryDataで更新するためAPI再取得不要
      staleTime: teamMode ? 30 * 1000 : Infinity,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: teamMode ? true : false,
      keepPreviousData: true,
      ...(teamMode &&
        teamId && {
          refetchInterval: 60 * 1000,
          refetchIntervalInBackground: true,
        }),
    },
  );
}

// タスク完全削除hook
export function usePermanentDeleteTask(options?: {
  teamMode?: boolean;
  teamId?: number;
}) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();
  const { teamMode = false, teamId } = options || {};

  return useMutation({
    mutationFn: async (itemId: string) => {
      const token = await getToken();
      if (teamMode && teamId) {
        // チーム側: displayId を送信
        const response = await tasksApi.permanentDeleteTeamTask(
          teamId,
          itemId,
          token || undefined,
        );
        const result = await response.json();
        return result;
      } else {
        // 個人側: displayId を送信
        const response = await tasksApi.permanentDeleteTask(
          itemId,
          token || undefined,
        );
        const result = await response.json();
        return result;
      }
    },
    onSuccess: (_, displayId) => {
      // 削除済み一覧から完全削除されたタスクを除去
      if (teamMode && teamId) {
        queryClient.setQueryData<DeletedTask[]>(
          ["team-deleted-tasks", teamId],
          (oldDeletedTasks) => {
            if (!oldDeletedTasks) return [];
            return oldDeletedTasks.filter(
              (task) => task.displayId !== displayId,
            );
          },
        );
      } else {
        queryClient.setQueryData<DeletedTask[]>(
          ["deleted-tasks"],
          (oldDeletedTasks) => {
            if (!oldDeletedTasks) return [];
            return oldDeletedTasks.filter(
              (task) => task.displayId !== displayId,
            );
          },
        );
      }
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
    mutationFn: async (itemId: string) => {
      const token = await getToken();

      if (teamMode && teamId) {
        // チームタスク復元: displayId を送信
        const response = await tasksApi.restoreTeamTask(
          teamId,
          itemId,
          token || undefined,
        );
        const result = await response.json();
        return result;
      } else {
        // 個人タスク復元: displayId を送信
        const response = await tasksApi.restoreTask(itemId, token || undefined);
        const result = await response.json();
        return result;
      }
    },
    onSuccess: (restoredTaskData, displayId) => {
      if (teamMode && teamId) {
        // チームモード: 既存のキャッシュ更新ロジックを維持（Step 2で対応）
        const deletedTask = queryClient
          .getQueryData<DeletedTask[]>(["team-deleted-tasks", teamId])
          ?.find((task) => task.displayId === displayId);

        queryClient.setQueryData<DeletedTask[]>(
          ["team-deleted-tasks", teamId],
          (oldDeletedTasks) => {
            if (!oldDeletedTasks) return [];
            return oldDeletedTasks.filter(
              (task) => task.displayId !== displayId,
            );
          },
        );

        if (deletedTask && restoredTaskData) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { deletedAt: _deletedAt, ...restoredTask } = deletedTask;
          queryClient.setQueryData<Task[]>(
            ["team-tasks", teamId],
            (oldTasks) => {
              if (!oldTasks) return [restoredTask as Task];
              const exists = oldTasks.some(
                (t) => t.displayId === restoredTask.displayId,
              );
              if (exists) return oldTasks;
              return [restoredTask as Task, ...oldTasks];
            },
          );
        }
      } else {
        // 個人モード: updateItemCacheで統一管理
        const deletedTask = queryClient
          .getQueryData<DeletedTask[]>(["deleted-tasks"])
          ?.find((task) => task.displayId === displayId);

        if (deletedTask && restoredTaskData) {
          updateItemCache({
            queryClient,
            itemType: "task",
            operation: "restore",
            item: deletedTask,
            boardId,
          });
        }
      }
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

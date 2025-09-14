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
      console.log(
        `🔥 [useCreateTask] onSuccessコールバック開始: teamMode=${teamMode}, teamId=${teamId}, newTask.id=${newTask?.id}`,
      );

      // APIが不完全なデータしか返さないため、タスク一覧を無効化して再取得
      if (teamMode && teamId) {
        console.log(
          `🔥 [useCreateTask] チームタスクキャッシュ無効化: teamId=${teamId}`,
        );
        queryClient.invalidateQueries({ queryKey: ["team-tasks", teamId] });

        // チームタスク一覧に新しいタスクを楽観的に追加
        queryClient.setQueryData<Task[]>(["team-tasks", teamId], (oldTasks) => {
          console.log(
            `📋 チームタスク一覧にタスク追加: ${oldTasks?.length || 0} → ${(oldTasks?.length || 0) + 1}`,
          );
          if (!oldTasks) return [newTask];
          return [...oldTasks, newTask];
        });

        // チーム掲示板キャッシュを楽観的更新（空表示を避けるため）
        console.log(
          `🏷️ チーム掲示板キャッシュ楽観的更新（作成時）: teamId=${teamId}, taskId=${newTask.id}`,
        );

        // 既存のボードアイテムキャッシュに新しいタスクを即座に追加
        const boardId = 1; // 仮値（実際はinitialBoardIdから取得すべき）
        queryClient.setQueryData(
          ["team-boards", teamId.toString(), boardId, "items"],
          (oldData: any) => {
            if (oldData?.items) {
              console.log(
                `🚀 楽観的更新: ${oldData.items.length} → ${oldData.items.length + 1}個`,
              );
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
          console.log(
            `📋 個人タスク一覧にタスク追加: ${oldTasks?.length || 0} → ${(oldTasks?.length || 0) + 1}`,
          );
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
    mutationFn: async (id: number) => {
      const token = await getToken();

      console.log(
        `🗑️ タスク削除開始: taskId=${id}, teamMode=${teamMode}, teamId=${teamId}`,
      );

      // 削除前チェック: キャッシュ内にタスクが存在するか確認
      const currentTasks =
        teamMode && teamId
          ? queryClient.getQueryData<Task[]>(["team-tasks", teamId])
          : queryClient.getQueryData<Task[]>(["tasks"]);

      const taskExists = currentTasks?.some((task) => task.id === id);
      console.log(
        `🔍 削除前チェック: taskId=${id}, 存在=${taskExists}, 総タスク数=${currentTasks?.length || 0}`,
      );

      if (!taskExists) {
        console.log(`⚠️ タスクが既に削除済みまたは存在しません: taskId=${id}`);
        throw new Error(`タスク(ID: ${id})は既に削除済みまたは存在しません。`);
      }

      if (teamMode && teamId) {
        // チームタスク削除
        console.log(
          `🚀 チームタスク削除API実行: teamId=${teamId}, taskId=${id}`,
        );
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
    },
    onSuccess: async (_, id) => {
      console.log(
        `🎉 タスク削除成功: taskId=${id}, teamMode=${teamMode}, teamId=${teamId}`,
      );

      if (teamMode && teamId) {
        // 1. チームタスク一覧から削除されたタスクを即座に除去
        console.log(
          `🔄 [削除成功] チームタスクキャッシュ手動更新開始: taskId=${id}`,
        );
        queryClient.setQueryData<Task[]>(["team-tasks", teamId], (oldTasks) => {
          if (!oldTasks) return [];
          const filteredTasks = oldTasks.filter((task) => task.id !== id);
          console.log(
            `📊 チームタスク数: ${oldTasks.length} → ${filteredTasks.length} (削除=${oldTasks.length - filteredTasks.length}件)`,
          );
          return filteredTasks;
        });

        // 2. チーム削除済み一覧は無効化（削除済みタスクが追加されるため）
        console.log(
          `🔄 [削除成功] チーム削除済みタスクキャッシュ無効化: teamId=${teamId}`,
        );
        await queryClient.invalidateQueries({
          queryKey: ["team-deleted-tasks", teamId],
        });

        // 3. チームボード関連のキャッシュを強制再取得（統計が変わるため）
        console.log(
          `🔄 [削除成功] チームボードキャッシュ強制再取得: teamId=${teamId}`,
        );
        await queryClient.refetchQueries({
          queryKey: ["team-boards", teamId.toString()],
        });

        // 4. 【重要】ボードアイテムキャッシュを完全無効化（削除されたタスクが表示から消えるため）
        console.log(
          `🔄 [削除成功] ボードアイテムキャッシュ完全無効化開始: teamId=${teamId}`,
        );
        await queryClient.invalidateQueries({
          queryKey: ["team-boards", teamId.toString()],
          exact: false,
        });

        // 5. 特定ボードのアイテムキャッシュも強制無効化
        const allQueries = queryClient.getQueryCache().getAll();
        const boardItemsQueries = allQueries.filter((q) => {
          const key = q.queryKey as string[];
          return (
            key[0] === "team-boards" &&
            key[1] === teamId.toString() &&
            key[3] === "items"
          );
        });

        console.log(
          `🔍 [削除成功] 発見されたボードアイテムクエリ数: ${boardItemsQueries.length}`,
        );
        for (const query of boardItemsQueries) {
          console.log(
            `🔄 [削除成功] ボードアイテムクエリ無効化: ${JSON.stringify(query.queryKey)}`,
          );
          await queryClient.invalidateQueries({
            queryKey: query.queryKey,
            exact: true,
          });
        }

        // 6. 強制再取得
        await queryClient.refetchQueries({
          queryKey: ["team-boards", teamId.toString()],
          exact: false,
        });
      } else {
        // 個人モード
        console.log(
          `🔄 [削除成功] 個人タスクキャッシュ手動更新開始: taskId=${id}`,
        );
        queryClient.setQueryData<Task[]>(["tasks"], (oldTasks) => {
          if (!oldTasks) return [];
          const filteredTasks = oldTasks.filter((task) => task.id !== id);
          console.log(
            `📊 個人タスク数: ${oldTasks.length} → ${filteredTasks.length} (削除=${oldTasks.length - filteredTasks.length}件)`,
          );
          return filteredTasks;
        });

        // 削除済み一覧は無効化（削除済みタスクが追加されるため）
        await queryClient.invalidateQueries({ queryKey: ["deleted-tasks"] });

        // ボード関連のキャッシュを強制再取得（統計が変わるため）
        await queryClient.refetchQueries({ queryKey: ["boards"] });
      }

      // 全タグ付け情報を無効化（削除されたタスクに関連するタグ情報が変わる可能性があるため）
      await queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
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
export function useRestoreTask() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (originalId: string) => {
      const token = await getToken();
      const response = await tasksApi.restoreTask(
        originalId,
        token || undefined,
      );
      const result = await response.json();
      return result;
    },
    onSuccess: () => {
      // タスクと削除済みタスクの両方を無効化（復元されたタスクの新しいIDが分からないため）
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["deleted-tasks"] });
      // ボード関連のキャッシュを強制再取得（復元されたタスクがボードに含まれる可能性があるため）
      queryClient.refetchQueries({ queryKey: ["boards"] });
      // ボード詳細とボード削除済みアイテムのキャッシュも無効化
      queryClient.invalidateQueries({ queryKey: ["boards"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["board-deleted-items"] });
      // ボードアイテムのキャッシュを無効化（復元時にボード紐づきも復元されるため）
      queryClient.invalidateQueries({ queryKey: ["board-items"] });
      // 全タグ付け情報を無効化（復元されたタスクのタグ情報が変わる可能性があるため）
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
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

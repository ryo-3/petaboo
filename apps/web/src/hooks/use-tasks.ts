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
    onSuccess: () => {
      // APIが不完全なデータしか返さないため、タスク一覧を無効化して再取得
      if (teamMode && teamId) {
        queryClient.invalidateQueries({ queryKey: ["team-tasks", teamId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
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
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      const response = await tasksApi.deleteTask(id, token || undefined);
      const result = await response.json();
      return result;
    },
    onSuccess: (_, id) => {
      // タスク一覧から削除されたタスクを除去
      queryClient.setQueryData<Task[]>(["tasks"], (oldTasks) => {
        if (!oldTasks) return [];
        return oldTasks.filter((task) => task.id !== id);
      });
      // 削除済み一覧は無効化（削除済みタスクが追加されるため）
      queryClient.invalidateQueries({ queryKey: ["deleted-tasks"] });
      // ボード関連のキャッシュを強制再取得（統計が変わるため）
      queryClient.refetchQueries({ queryKey: ["boards"] });
      // 全タグ付け情報を無効化（削除されたタスクに関連するタグ情報が変わる可能性があるため）
      queryClient.invalidateQueries({ queryKey: ["taggings", "all"] });
    },
    onError: (error) => {
      console.error("タスク削除に失敗しました:", error);
      showToast("タスク削除に失敗しました", "error");
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

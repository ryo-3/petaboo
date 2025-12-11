import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { updateItemCache } from "@/src/lib/cache-utils";
import { useToast } from "@/src/contexts/toast-context";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

// チームタスクの型定義
export interface TeamTask {
  id: number;
  teamId: number;
  displayId: string;
  uuid: string | null;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  dueDate: number | null;
  categoryId: number | null;
  boardCategoryId: number | null;
  createdAt: number;
  updatedAt: number | null;
  // チーム機能用（作成者情報）
  userId?: string;
  createdBy?: string | null;
  avatarColor?: string | null;
}

export interface TeamDeletedTask extends TeamTask {
  deletedAt: number;
}

interface CreateTeamTaskData {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  categoryId?: number;
  boardCategoryId?: number;
}

interface UpdateTeamTaskData {
  title?: string;
  description?: string;
  status?: "todo" | "in_progress" | "completed";
  priority?: "low" | "medium" | "high";
  dueDate?: number;
  categoryId?: number;
  boardCategoryId?: number;
  updatedAt?: number; // 楽観的ロック用
}

// チームタスク一覧取得
export function useTeamTasks(teamId?: number) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["team-tasks", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");

      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/tasks`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch team tasks");
      }

      return response.json() as Promise<TeamTask[]>;
    },
    enabled: !!teamId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });
}

// 削除済みチームタスク一覧取得
export function useDeletedTeamTasks(teamId?: number) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["team-deleted-tasks", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");

      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/tasks/deleted`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch deleted team tasks");
      }

      return response.json() as Promise<TeamDeletedTask[]>;
    },
    enabled: !!teamId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });
}

// チームタスク作成
export function useCreateTeamTask(teamId?: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTeamTaskData) => {
      if (!teamId) throw new Error("Team ID is required");

      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create team task");
      }

      return response.json() as Promise<TeamTask>;
    },
    onSuccess: (newTask) => {
      updateItemCache({
        queryClient,
        itemType: "task",
        operation: "create",
        item: newTask,
        teamId,
      });
    },
  });
}

// 競合エラーの型定義
interface ConflictError extends Error {
  status: number;
  latestData?: TeamTask;
}

// チームタスク更新
export function useUpdateTeamTask(teamId?: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateTeamTaskData;
    }) => {
      if (!teamId) throw new Error("Team ID is required");

      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/tasks/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(data),
        },
      );

      // 409 Conflict: 楽観的ロックによる競合検出
      if (response.status === 409) {
        const errorData = await response.json();
        const error = new Error("Conflict") as ConflictError;
        error.status = 409;
        error.latestData = errorData.latestData;
        throw error;
      }

      if (!response.ok) {
        throw new Error("Failed to update team task");
      }

      return response.json() as Promise<TeamTask>;
    },
    onSuccess: (updatedTask) => {
      updateItemCache({
        queryClient,
        itemType: "task",
        operation: "update",
        item: updatedTask,
        teamId,
      });
    },
    onError: (error: ConflictError) => {
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
      }
    },
  });
}

// チームタスク削除
export function useDeleteTeamTask(teamId?: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      if (!teamId) throw new Error("Team ID is required");

      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/tasks/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete team task");
      }

      return response.json() as Promise<TeamTask>;
    },
    onSuccess: (deletedTask) => {
      updateItemCache({
        queryClient,
        itemType: "task",
        operation: "delete",
        item: deletedTask,
        teamId,
      });
    },
  });
}

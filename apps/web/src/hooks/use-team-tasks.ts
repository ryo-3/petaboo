import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

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
    placeholderData: [], // 初回も即座に空配列を表示
    keepPreviousData: true, // 前回のデータを表示しながら新データをフェッチ
    refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得（他メンバーの変更を反映）
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
    placeholderData: [], // 初回も即座に空配列を表示
    keepPreviousData: true, // 前回のデータを表示しながら新データをフェッチ
    refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得（他メンバーの変更を反映）
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-tasks", teamId] });
      // チームタグ付け情報も無効化（タスク変更時にタグ情報も更新される可能性）
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
    },
  });
}

// チームタスク更新
export function useUpdateTeamTask(teamId?: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

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

      if (!response.ok) {
        throw new Error("Failed to update team task");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-tasks", teamId] });
      // チームタグ付け情報も無効化（タスク変更時にタグ情報も更新される可能性）
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
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

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-tasks", teamId] });
      // チームタグ付け情報も無効化（タスク変更時にタグ情報も更新される可能性）
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
      queryClient.invalidateQueries({
        queryKey: ["team-deleted-tasks", teamId],
      });
    },
  });
}

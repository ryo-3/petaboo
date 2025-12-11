import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { updateItemCache } from "@/src/lib/cache-utils";
import { useToast } from "@/src/contexts/toast-context";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

// チームメモの型定義
export interface TeamMemo {
  id: number;
  teamId: number;
  displayId: string;
  uuid: string | null;
  title: string;
  content: string | null;
  createdAt: number;
  updatedAt: number | null;
  // チーム機能用（作成者情報）
  userId?: string;
  createdBy?: string | null;
  avatarColor?: string | null;
}

export interface TeamDeletedMemo extends TeamMemo {
  deletedAt: number;
}

interface CreateTeamMemoData {
  title: string;
  content?: string;
}

interface UpdateTeamMemoData {
  title: string;
  content?: string;
  updatedAt?: number; // 楽観的ロック用
}

// チームメモ一覧取得
export function useTeamMemos(teamId?: number) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["team-memos", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");

      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/memos`, {
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch team memos");
      }

      return response.json() as Promise<TeamMemo[]>;
    },
    enabled: !!teamId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });
}

// 削除済みチームメモ一覧取得
export function useDeletedTeamMemos(teamId?: number) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["team-deleted-memos", teamId],
    queryFn: async () => {
      if (!teamId) throw new Error("Team ID is required");

      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/memos/deleted`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch deleted team memos");
      }

      return response.json() as Promise<TeamDeletedMemo[]>;
    },
    enabled: !!teamId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
  });
}

// チームメモ作成
export function useCreateTeamMemo(teamId?: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTeamMemoData) => {
      if (!teamId) throw new Error("Team ID is required");

      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/teams/${teamId}/memos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create team memo");
      }

      return response.json() as Promise<TeamMemo>;
    },
    onSuccess: (newMemo) => {
      updateItemCache({
        queryClient,
        itemType: "memo",
        operation: "create",
        item: newMemo,
        teamId,
      });
    },
  });
}

// 競合エラーの型定義
interface ConflictError extends Error {
  status: number;
  latestData?: TeamMemo;
}

// チームメモ更新
export function useUpdateTeamMemo(teamId?: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateTeamMemoData;
    }) => {
      if (!teamId) throw new Error("Team ID is required");

      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/memos/${id}`,
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
        throw new Error("Failed to update team memo");
      }

      return response.json() as Promise<TeamMemo>;
    },
    onSuccess: (updatedMemo) => {
      updateItemCache({
        queryClient,
        itemType: "memo",
        operation: "update",
        item: updatedMemo,
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
          itemType: "memo",
          operation: "update",
          item: error.latestData,
          teamId,
        });
      }
    },
  });
}

// チームメモ削除
export function useDeleteTeamMemo(teamId?: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      if (!teamId) throw new Error("Team ID is required");

      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/teams/${teamId}/memos/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete team memo");
      }

      return response.json() as Promise<TeamMemo>;
    },
    onSuccess: (deletedMemo) => {
      updateItemCache({
        queryClient,
        itemType: "memo",
        operation: "delete",
        item: deletedMemo,
        teamId,
      });
    },
  });
}

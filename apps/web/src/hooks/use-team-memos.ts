import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { updateItemCache } from "@/src/lib/cache-utils";

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
    placeholderData: [], // 初回も即座に空配列を表示
    keepPreviousData: true, // 前回のデータを表示しながら新データをフェッチ
    refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得（他メンバーの変更を反映）
    refetchIntervalInBackground: true, // バックグラウンドタブでも定期取得を継続
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
    placeholderData: [], // 初回も即座に空配列を表示
    keepPreviousData: true, // 前回のデータを表示しながら新データをフェッチ
    refetchInterval: 60 * 1000, // チームモード: 1分ごとに再取得（他メンバーの変更を反映）
    refetchIntervalInBackground: true, // バックグラウンドタブでも定期取得を継続
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
      // チームタグ付け情報も無効化（新しいメモにタグが付いている可能性）
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
    },
  });
}

// チームメモ更新
export function useUpdateTeamMemo(teamId?: number) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

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
      // チームタグ付け情報も無効化（メモ更新時にタグ情報も更新される可能性）
      queryClient.invalidateQueries({ queryKey: ["team-taggings", teamId] });
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

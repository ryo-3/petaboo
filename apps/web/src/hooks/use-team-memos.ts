import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594";

// チームメモの型定義
export interface TeamMemo {
  id: number;
  teamId: number;
  originalId: string;
  uuid: string | null;
  title: string;
  content: string | null;
  createdAt: number;
  updatedAt: number | null;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-memos", teamId] });
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

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-memos", teamId] });
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

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-memos", teamId] });
      queryClient.invalidateQueries({
        queryKey: ["team-deleted-memos", teamId],
      });
    },
  });
}

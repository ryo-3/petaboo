import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface CreateTeamData {
  name: string;
  description?: string;
  customUrl: string;
}

interface Team {
  id: number;
  name: string;
  description?: string;
  customUrl: string;
  createdAt: string;
  updatedAt: string;
  role: string;
}

export function useCreateTeam() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTeamData): Promise<Team> => {
      const token = await getToken();
      const response = await fetch(`${API_URL}/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "チーム作成に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      // チーム統計とチーム一覧を無効化
      queryClient.invalidateQueries({ queryKey: ["teamStats"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

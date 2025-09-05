import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface JoinByCodeRequest {
  shortCode: string;
}

export function useJoinByCode() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ shortCode }: JoinByCodeRequest) => {
      const token = await getToken();

      const response = await fetch(`${API_URL}/teams/join-by-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shortCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("API Error:", error);
        throw new Error(error.message || "チームへの参加に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      // チーム一覧をリフレッシュ
      queryClient.invalidateQueries({
        queryKey: ["teams"],
      });
    },
  });
}

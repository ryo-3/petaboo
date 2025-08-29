import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface InviteToTeamRequest {
  customUrl: string;
  email: string;
  role?: "admin" | "member";
}

export function useInviteToTeam() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      customUrl,
      email,
      role = "member",
    }: InviteToTeamRequest) => {
      const token = await getToken();

      const response = await fetch(`${API_URL}/teams/${customUrl}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("API Error:", error);
        throw new Error(
          error.error || error.message || "招待の送信に失敗しました",
        );
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // チーム詳細をリフレッシュ
      queryClient.invalidateQueries({
        queryKey: ["team", variables.customUrl],
      });

      // チーム一覧もリフレッシュ（メンバー数の更新など）
      queryClient.invalidateQueries({
        queryKey: ["teams"],
      });
    },
  });
}

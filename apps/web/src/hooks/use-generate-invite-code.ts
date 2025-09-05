import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface GenerateInviteCodeRequest {
  customUrl: string;
  role?: "admin" | "member";
  expiresInDays?: number;
}

export function useGenerateInviteCode() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({
      customUrl,
      role = "member",
      expiresInDays = 3,
    }: GenerateInviteCodeRequest) => {
      const token = await getToken();

      const response = await fetch(`${API_URL}/teams/${customUrl}/invite-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role,
          expiresInDays,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("API Error:", error);
        throw new Error(
          error.error || error.message || "招待コードの生成に失敗しました",
        );
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      // チーム詳細をリフレッシュ
      queryClient.invalidateQueries({
        queryKey: ["team", variables.customUrl],
      });

      // チーム一覧もリフレッシュ
      queryClient.invalidateQueries({
        queryKey: ["teams"],
      });
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

interface UpdateDisplayNameParams {
  customUrl: string;
  displayName: string;
}

export function useUpdateMemberDisplayName() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async ({ customUrl, displayName }: UpdateDisplayNameParams) => {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/teams/${customUrl}/members/me/display-name`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ displayName }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "表示名の更新に失敗しました");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // チーム詳細データを再取得
      queryClient.invalidateQueries({
        queryKey: ["team", variables.customUrl],
      });
      queryClient.invalidateQueries({
        queryKey: ["teamDetail", variables.customUrl],
      });
    },
  });
}

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

interface KickMemberParams {
  customUrl: string;
  userId: string;
}

export function useKickMember() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ customUrl, userId }: KickMemberParams) => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teams/${customUrl}/members/${userId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "メンバーのキックに失敗しました");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      // チーム詳細（メンバー一覧含む）をリフレッシュ
      queryClient.invalidateQueries({
        queryKey: ["team", variables.customUrl],
      });
    },
  });
}

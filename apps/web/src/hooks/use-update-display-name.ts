import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

interface UserInfo {
  userId: string;
  displayName: string | null;
  planType: "free" | "premium";
  createdAt: number;
}
import { usersApi } from "@/src/lib/api-client";

export function useUpdateDisplayName() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: async (displayName: string) => {
      const token = await getToken();
      const response = await usersApi.updateDisplayName(
        displayName,
        token || undefined,
      );
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      // ユーザー情報キャッシュを更新
      queryClient.setQueryData(
        ["user-info"],
        (oldData: UserInfo | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            displayName: data.displayName,
          };
        },
      );

      // ユーザー情報を再取得（念のため）
      queryClient.invalidateQueries({ queryKey: ["user-info"] });
    },
  });
}

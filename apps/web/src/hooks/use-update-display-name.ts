import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
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
      queryClient.setQueryData(["user-info"], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          displayName: data.displayName,
        };
      });

      // ユーザー情報を再取得（念のため）
      queryClient.invalidateQueries({ queryKey: ["user-info"] });
    },
  });
}

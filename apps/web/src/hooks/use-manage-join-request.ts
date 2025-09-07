import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

export function useManageJoinRequest(customUrl: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teams/${customUrl}/join-requests/${requestId}/approve`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "承認に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      // 承認待ちリストとチーム詳細を再取得
      queryClient.invalidateQueries({ queryKey: ["join-requests", customUrl] });
      queryClient.invalidateQueries({ queryKey: ["team", customUrl] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: number) => {
      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teams/${customUrl}/join-requests/${requestId}/reject`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "拒否に失敗しました");
      }

      return response.json();
    },
    onSuccess: () => {
      // 承認待ちリストを再取得
      queryClient.invalidateQueries({ queryKey: ["join-requests", customUrl] });
    },
  });

  return {
    approve: approveMutation.mutate,
    reject: rejectMutation.mutate,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    approveError: approveMutation.error,
    rejectError: rejectMutation.error,
  };
}

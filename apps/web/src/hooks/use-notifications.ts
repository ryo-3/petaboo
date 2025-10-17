import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/lib/api/notifications";

// 通知一覧取得
export function useNotifications(teamId: number | undefined) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  return useQuery({
    queryKey: ["notifications", teamId],
    queryFn: async () => {
      if (!teamId) return { notifications: [], unreadCount: 0 };
      const token = await getToken();
      if (!token) {
        // トークンがない場合は空の結果を返す（エラーを投げない）
        return { notifications: [], unreadCount: 0 };
      }
      return getNotifications(teamId, token);
    },
    // 認証が完全に読み込まれ、ログイン済みで、teamIdがある場合のみ実行
    enabled: !!teamId && isLoaded && isSignedIn,
    refetchInterval: !!teamId && isLoaded && isSignedIn ? 60 * 1000 : false, // 条件を満たす場合のみ1分ごとに再取得
  });
}

// 通知を既読にする
export function useMarkNotificationAsRead() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication token not available");
      }
      return markNotificationAsRead(notificationId, token);
    },
    onSuccess: () => {
      // 通知一覧を再取得
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
      });
    },
  });
}

// すべて既読にする
export function useMarkAllNotificationsAsRead(teamId: number | undefined) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!teamId) return { success: false };
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication token not available");
      }
      return markAllNotificationsAsRead(teamId, token);
    },
    onSuccess: () => {
      // 通知一覧を再取得
      queryClient.invalidateQueries({
        queryKey: ["notifications", teamId],
      });
    },
  });
}

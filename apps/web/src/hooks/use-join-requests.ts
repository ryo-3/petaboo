import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

interface JoinRequest {
  id: number;
  displayName: string | null;
  email: string;
  createdAt: number;
  message: string | null;
  userId: string | null;
}

interface JoinRequestsResponse {
  requests: JoinRequest[];
}

export function useJoinRequests(
  customUrl: string | undefined,
  hasNotifications?: boolean,
  isVisible?: boolean,
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["join-requests", customUrl],
    queryFn: async () => {
      if (!customUrl) {
        return { requests: [] };
      }

      const token = await getToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/teams/${customUrl}/join-requests`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        },
      );

      if (!response.ok) {
        // 403の場合は権限がないので、空の配列を返す（エラーにしない）
        if (response.status === 403) {
          return { requests: [] };
        }
        const error = await response.json();
        throw new Error(error.message || "承認待ちリストの取得に失敗しました");
      }

      return response.json() as Promise<JoinRequestsResponse>;
    },
    enabled: !!customUrl,
    refetchInterval: hasNotifications && isVisible ? 10000 : false, // 通知があり、かつページが見える場合のみ10秒間隔で自動更新
  });
}

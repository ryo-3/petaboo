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
  isMouseActive?: boolean,
) {
  const { getToken } = useAuth();

  // バックグラウンドまたは通知なしの場合は完全無効化
  const shouldFetch = hasNotifications && isVisible;

  // 間隔計算（シンプルな静的値）
  const refetchInterval = !shouldFetch
    ? false
    : isMouseActive === true
      ? 10000
      : 30000;

  // デバッグログ
  // console.log(
  //   `🎯 [useJoinRequests] ${customUrl}: shouldFetch=${shouldFetch}, isMouseActive=${isMouseActive}, refetchInterval=${refetchInterval}`,
  // );

  return useQuery({
    queryKey: ["join-requests", customUrl, shouldFetch, isMouseActive],
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
    enabled: shouldFetch && !!customUrl,
    refetchInterval,
  });
}

import { useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface SimpleNotifierResult {
  hasUpdates: boolean; // ヘッダーバッジ用（既読後はfalse）
  hasNotifications: boolean; // 通知一覧用（既読後もtrue）
  isRead: boolean; // 既読状態
  counts: {
    teamRequests: number;
    myRequests: number;
  };
  lastCheckedAt: string;
  debug?: {
    response?: string;
    originalHasUpdates?: boolean;
    lastReadTime?: string | null;
    isAlreadyRead?: boolean;
  };
}

/**
 * 特定チーム向けのシンプルな通知チェッカー
 * path:/team/moricrew の時に moricrew の申請をチェック
 */
interface NotifierOptions {
  onUpdate?: (data: SimpleNotifierResult) => void;
}

export function useSimpleTeamNotifier(
  teamName?: string,
  isVisible: boolean = true,
  options?: NotifierOptions,
) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // React Queryで通知チェック（複数箇所で呼んでも1回のAPIリクエストに統合）
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["team-notifications", teamName],
    queryFn: async (): Promise<SimpleNotifierResult> => {
      if (!teamName) {
        return {
          hasUpdates: false,
          hasNotifications: false,
          isRead: false,
          counts: { teamRequests: 0, myRequests: 0 },
          lastCheckedAt: new Date().toISOString(),
        };
      }

      const token = await getToken();
      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:7594"}/teams/notifications/check`;
      const params = new URLSearchParams({
        teamFilter: teamName,
        types: "team_requests",
      });

      const response = await fetch(`${url}?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const resultText = await response.text();
      const hasUpdates = resultText === "1";
      const readKey = `teamNotificationRead_${teamName}`;
      const lastReadTime = localStorage.getItem(readKey);
      const isAlreadyRead = false; // 一時的に既読チェックを無効化
      const finalHasUpdates = hasUpdates && !isAlreadyRead;

      const result: SimpleNotifierResult = {
        hasUpdates: finalHasUpdates,
        hasNotifications: hasUpdates,
        isRead: isAlreadyRead,
        counts: {
          teamRequests: finalHasUpdates ? 1 : 0,
          myRequests: 0,
        },
        lastCheckedAt: new Date().toISOString(),
        debug: {
          response: resultText,
          originalHasUpdates: hasUpdates,
          lastReadTime,
          isAlreadyRead,
        },
      };

      // 通知があった場合、join-requestsクエリを無効化
      if (hasUpdates && teamName) {
        queryClient.invalidateQueries({
          queryKey: ["join-requests", teamName],
        });
      }

      // コールバック実行
      if (options?.onUpdate) {
        options.onUpdate(result);
      }

      return result;
    },
    enabled: !!teamName && isVisible,
    refetchInterval: isVisible ? 60000 : false, // 1分間隔で自動更新
    staleTime: 30000, // 30秒間はキャッシュから返す（複数箇所で呼んでも1回のみ）
  });

  // 手動チェック用
  const checkNow = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    data: data ?? null,
    isLoading,
    error: error ? (error as Error).message : null,
    checkNow,
    teamName,
  };
}

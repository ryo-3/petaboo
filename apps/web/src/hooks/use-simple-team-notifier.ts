import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

interface SimpleNotifierResult {
  hasUpdates: boolean;
  counts: {
    teamRequests: number;
    myRequests: number;
  };
  lastCheckedAt: string;
  debug?: { response?: string };
}

/**
 * 特定チーム向けのシンプルな通知チェッカー
 * path:/team/moricrew の時に moricrew の申請をチェック
 */
export function useSimpleTeamNotifier(teamName?: string) {
  const { getToken } = useAuth();
  const [data, setData] = useState<SimpleNotifierResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkNotifications = useCallback(async () => {
    if (!teamName) {
      console.log("❌ チーム名なし、チェック停止");
      return;
    }

    // console.log(`🚀 通知チェック開始: ${teamName}`);
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:7594"}/teams/notifications/check`;

      const params = new URLSearchParams({
        teamFilter: teamName,
        types: "team_requests",
      });

      // console.log(`📡 API呼び出し: ${url}?${params.toString()}`);

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

      const result: SimpleNotifierResult = {
        hasUpdates,
        counts: {
          teamRequests: hasUpdates ? 1 : 0,
          myRequests: 0,
        },
        lastCheckedAt: new Date().toISOString(),
        debug: { response: resultText },
      };

      // 通知がある場合のみログ出力
      if (hasUpdates) {
        console.log("✅ 通知チェック完了:", result);
        console.log(
          `🔔 通知あり: チーム ${teamName} に申請あり (${resultText})`,
        );
      }

      setData(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      console.error(`❌ 通知チェックエラー [${teamName}]:`, errorMsg);
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [teamName, getToken]);

  // 手動チェック用
  const checkNow = () => {
    checkNotifications();
  };

  // 初回チェック + 10秒間隔での定期チェック
  useEffect(() => {
    if (!teamName) return;

    console.log(`🎯 チーム切り替え検知: ${teamName} (10秒間隔開始)`);

    // 初回実行
    checkNotifications();

    // 10秒間隔での定期実行
    const interval = setInterval(() => {
      checkNotifications();
    }, 10000); // 10秒間隔

    // クリーンアップ
    return () => {
      console.log(`⏹️ チーム通知チェック停止: ${teamName}`);
      clearInterval(interval);
    };
  }, [teamName, checkNotifications]);

  return {
    data,
    isLoading,
    error,
    checkNow,
    teamName,
  };
}

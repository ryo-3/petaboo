import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

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
export function useSimpleTeamNotifier(
  teamName?: string,
  isVisible: boolean = true,
) {
  const { getToken } = useAuth();
  const [data, setData] = useState<SimpleNotifierResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 手動チェック用（簡潔版）
  const checkNow = async () => {
    if (!teamName) return;

    try {
      const token = await getToken();
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:7594"}/teams/notifications/check`;
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

      if (response.ok) {
        const resultText = await response.text();
        const hasUpdates = resultText === "1";
        const readKey = `teamNotificationRead_${teamName}`;
        const lastReadTime = localStorage.getItem(readKey);
        const isAlreadyRead = false; // 一時的に既読チェックを無効化
        const finalHasUpdates = hasUpdates && !isAlreadyRead;

        setData({
          hasUpdates: finalHasUpdates, // ヘッダーバッジ用
          hasNotifications: hasUpdates, // 通知一覧用（常に実際の通知状況）
          isRead: isAlreadyRead, // 既読状態
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
        });
      }
    } catch (err) {
      console.error("手動チェックエラー:", err);
    }
  };

  // 10秒間隔での通知チェック
  useEffect(() => {
    if (!teamName) return;

    // チェック間隔を決定（シンプル版）
    const checkInterval = isVisible ? 10000 : null; // アクティブ: 10秒, バックグラウンド: 停止

    // console.log(`🎯 チーム切り替え検知: ${teamName}`);
    // console.log(
    //   `🚀 通知チェック開始: ${teamName} (${checkInterval ? `${checkInterval / 1000}秒間隔` : "停止"})`,
    // );
    // console.log(
    //   `🔍 [useSimpleTeamNotifier] isVisible: ${isVisible}`,
    // );

    // 共通のチェック関数
    const performCheck = async () => {
      try {
        const token = await getToken();
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:7594"}/teams/notifications/check`;
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

        // 既読チェック - 一時的に無効化してテスト
        const readKey = `teamNotificationRead_${teamName}`;
        const lastReadTime = localStorage.getItem(readKey);
        const isAlreadyRead = false; // 一時的に既読チェックを無効化
        const finalHasUpdates = hasUpdates && !isAlreadyRead;

        const result: SimpleNotifierResult = {
          hasUpdates: finalHasUpdates, // ヘッダーバッジ用
          hasNotifications: hasUpdates, // 通知一覧用（常に実際の通知状況）
          isRead: isAlreadyRead, // 既読状態
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

        // console.log("✅ 通知チェック完了:", result);
        // if (finalHasUpdates) {
        //   console.log(
        //     `🔔 通知あり: チーム ${teamName} に申請あり (${resultText})`,
        //   );
        // } else {
        //   console.log(
        //     `📭 通知なし: チーム ${teamName} (${resultText}), 既読=${isAlreadyRead}, hasUpdates=${hasUpdates}`,
        //   );
        // }
        setData(result);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        console.error(`❌ 通知チェックエラー [${teamName}]:`, errorMsg);
        setError(errorMsg);
      }
    };

    // 初回実行
    setIsLoading(true);
    performCheck().finally(() => setIsLoading(false));

    // 段階的間隔でチェック
    const interval = checkInterval
      ? setInterval(() => {
          performCheck();
        }, checkInterval)
      : null;

    // クリーンアップ
    return () => {
      // console.log(`⏹️ 通知チェック停止: ${teamName}`);
      if (interval) clearInterval(interval);
    };
  }, [teamName, getToken, isVisible]);

  return {
    data,
    isLoading,
    error,
    checkNow,
    teamName,
  };
}

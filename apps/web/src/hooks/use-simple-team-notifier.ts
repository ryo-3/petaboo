import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";

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
  const [data, setData] = useState<SimpleNotifierResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 手動チェック用（簡潔版）
  const checkNow = useCallback(async () => {
    if (!teamName) return;

    try {
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

        // 通知があった場合、join-requestsクエリを無効化
        if (hasUpdates && teamName) {
          queryClient.invalidateQueries(["join-requests", teamName]);
        }
      }
    } catch (err) {
      console.error("手動チェックエラー:", err);
    }
  }, [teamName, getToken, queryClient]);

  // 1分間隔での通知チェック
  useEffect(() => {
    if (!teamName) return;

    // チェック間隔を決定（シンプル版）
    const checkInterval = isVisible ? 60000 : null; // アクティブ: 1分, バックグラウンド: 停止

    // 共通のチェック関数
    const performCheck = async () => {
      try {
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

        // 通知があった場合、join-requestsクエリを無効化してリフレッシュ
        if (result.hasNotifications && teamName) {
          queryClient.invalidateQueries(["join-requests", teamName]);
        }

        // コールバック実行
        if (options?.onUpdate) {
          options.onUpdate(result);
        }
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
  }, [teamName, getToken, isVisible, queryClient, options]);

  // 強制通知チェックイベントリスナー（承認・拒否後の即座更新用）
  useEffect(() => {
    if (!teamName) return;

    const handleForceCheck = (event: CustomEvent) => {
      const { teamName: eventTeamName } = event.detail;
      if (eventTeamName === teamName) {
        checkNow();
      }
    };

    window.addEventListener(
      "force-notification-check",
      handleForceCheck as EventListener,
    );

    return () => {
      window.removeEventListener(
        "force-notification-check",
        handleForceCheck as EventListener,
      );
    };
  }, [teamName, checkNow]);

  return {
    data,
    isLoading,
    error,
    checkNow,
    teamName,
  };
}

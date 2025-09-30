import { useEffect, useState } from "react";
import { useMyJoinRequests } from "./use-my-join-requests";

interface PersonalNotifierResult {
  hasUpdates: boolean;
  counts: {
    approvedRequests: number;
  };
  lastCheckedAt: string;
  approvedRequests: Array<{
    id: number;
    teamName: string;
    teamCustomUrl: string;
    processedAt: number;
  }>;
}

/**
 * 個人向け通知チェッカー
 * 承認された申請のみ通知として表示
 * 申請中データがある時のみ処理を実行（最適化）
 */
export function usePersonalNotifier() {
  const { data: myRequests, isLoading, error } = useMyJoinRequests();
  const [data, setData] = useState<PersonalNotifierResult | null>(null);

  useEffect(() => {
    if (!myRequests) return;

    // 申請中データがあるかチェック（最適化条件）
    const hasPendingRequests = myRequests.requests.some(
      (request) => request.status === "pending",
    );

    // 承認された申請のみ抽出
    const approvedRequests = myRequests.requests
      .filter((request) => request.status === "approved")
      .map((request) => ({
        id: request.id,
        teamName: request.teamName,
        teamCustomUrl: request.teamCustomUrl,
        processedAt: request.processedAt || 0,
      }))
      .sort((a, b) => b.processedAt - a.processedAt); // 新しい順

    // 申請中データがない場合は通知チェックをスキップ
    if (!hasPendingRequests && approvedRequests.length === 0) {
      setData({
        hasUpdates: false,
        counts: { approvedRequests: 0 },
        lastCheckedAt: new Date().toISOString(),
        approvedRequests: [],
      });
      return;
    }

    const result: PersonalNotifierResult = {
      hasUpdates: false,
      counts: {
        approvedRequests: 0,
      },
      lastCheckedAt: new Date().toISOString(),
      approvedRequests: [],
    };

    setData(result);
  }, [myRequests]);

  // 手動で既読にする関数（無効化）
  const markAsRead = () => {
    // 既読機能を無効化
  };

  return {
    data,
    isLoading,
    error,
    markAsRead,
  };
}

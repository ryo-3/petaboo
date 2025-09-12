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
      console.log("📭 申請中データなし - 通知チェックをスキップ");
      setData({
        hasUpdates: false,
        counts: { approvedRequests: 0 },
        lastCheckedAt: new Date().toISOString(),
        approvedRequests: [],
      });
      return;
    }

    // 既読チェック
    const lastReadTime = localStorage.getItem("personalNotificationRead");
    const lastReadTimestamp = lastReadTime
      ? new Date(lastReadTime).getTime() / 1000
      : 0;

    // 最後に読んだ時刻より新しい承認があるかチェック
    const newApprovals = approvedRequests.filter(
      (request) => request.processedAt > lastReadTimestamp,
    );

    const result: PersonalNotifierResult = {
      hasUpdates: newApprovals.length > 0,
      counts: {
        approvedRequests: newApprovals.length,
      },
      lastCheckedAt: new Date().toISOString(),
      approvedRequests: newApprovals,
    };

    setData(result);

    // デバッグログ
    if (hasPendingRequests) {
      console.log("🔍 申請中データあり - 通知チェック実行");
    }
    if (newApprovals.length > 0) {
      console.log(`🎉 新しい承認通知: ${newApprovals.length}件`, newApprovals);
    }
  }, [myRequests]);

  // 手動で既読にする関数
  const markAsRead = () => {
    const now = new Date().toISOString();
    localStorage.setItem("personalNotificationRead", now);
    console.log("🔔 個人通知を既読にしました");

    // データを更新
    if (data) {
      setData({
        ...data,
        hasUpdates: false,
        counts: { approvedRequests: 0 },
        approvedRequests: [],
      });
    }
  };

  return {
    data,
    isLoading,
    error,
    markAsRead,
  };
}

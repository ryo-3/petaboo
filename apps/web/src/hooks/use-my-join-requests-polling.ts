import { useQueryClient } from "@tanstack/react-query";
import { useConditionalPolling } from "./use-conditional-polling";

interface MyJoinRequestUpdate {
  type: "request_status_changed";
  requestId: number;
  newStatus: "pending" | "approved" | "rejected";
  teamName: string;
  message?: string;
}

/**
 * 申請者側の申請状況リアルタイム更新フック
 * ホーム画面でチームアイコンがアクティブな時のみポーリングを実行
 */
export function useMyJoinRequestsPolling() {
  const queryClient = useQueryClient();

  const handleUpdates = (update: MyJoinRequestUpdate) => {
    console.log("🔔 申請状況更新:", update);

    // 申請状況を再取得
    queryClient.invalidateQueries({
      queryKey: ["my-join-requests"],
    });

    // 更新されたチーム一覧も再取得
    queryClient.invalidateQueries({
      queryKey: ["teams"],
    });

    // TODO: 必要に応じて通知表示
    if (update.newStatus === "approved") {
      console.log(`✅ チーム「${update.teamName}」への参加が承認されました`);
    } else if (update.newStatus === "rejected") {
      console.log(`❌ チーム「${update.teamName}」への参加が拒否されました`);
    }
  };

  const handleError = (error: Error) => {
    console.error("申請状況ポーリングエラー:", error);
  };

  const pollingResult = useConditionalPolling<MyJoinRequestUpdate>({
    endpoint: "/teams/my-requests/wait-updates",
    iconStateKey: "team", // チームアイコンがアクティブな時のみ
    additionalConditions: {
      // ホーム画面でのみ実行（チーム詳細ページでは不要）
      onHomePage: true,
    },
    onUpdate: handleUpdates,
    onError: handleError,
    waitTimeoutSec: 120, // 2分待機
    enabled: true, // 常に有効（条件は additionalConditions で制御）
  });

  return {
    isPolling: pollingResult.isPolling,
    conditions: pollingResult.conditions,
  };
}

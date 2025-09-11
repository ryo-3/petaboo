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
 * グローバル通知用のポーリングフック
 * どの画面にいても常にバックグラウンドで実行される
 */
export function useGlobalTeamNotifications() {
  const queryClient = useQueryClient();

  const handleUpdates = (update: MyJoinRequestUpdate) => {
    console.log("🌐 グローバル通知受信:", update);

    // 申請状況を再取得
    queryClient.invalidateQueries({
      queryKey: ["my-join-requests"],
    });

    // 更新されたチーム一覧も再取得
    queryClient.invalidateQueries({
      queryKey: ["teams"],
    });

    // チーム申請一覧も更新
    queryClient.invalidateQueries({
      queryKey: ["join-requests"],
    });

    // 通知表示
    if (update.newStatus === "approved") {
      console.log(
        `✅ グローバル通知: チーム「${update.teamName}」への参加が承認されました`,
      );
    } else if (update.newStatus === "rejected") {
      console.log(
        `❌ グローバル通知: チーム「${update.teamName}」への参加が拒否されました`,
      );
    }
  };

  const handleError = (error: Error) => {
    console.error("グローバル通知ポーリングエラー:", error);
  };

  // アイコン状態に関係なく常に実行するポーリング
  const pollingResult = useConditionalPolling<MyJoinRequestUpdate>({
    endpoint: "/teams/my-requests/wait-updates",
    iconStateKey: "team", // この条件は無視される
    additionalConditions: {
      // 常に有効にするための条件
      alwaysEnabled: true,
    },
    onUpdate: handleUpdates,
    onError: handleError,
    waitTimeoutSec: 120,
    enabled: true,
  });

  return {
    isPolling: pollingResult.isPolling,
    conditions: pollingResult.conditions,
  };
}

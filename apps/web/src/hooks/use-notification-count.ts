import { useTeams } from "./use-teams";
import { useJoinRequests } from "./use-join-requests";
import { useMyJoinRequests } from "./use-my-join-requests";
import { useCallback } from "react";

export function useNotificationCount() {
  const { data: teams } = useTeams();
  const { data: myJoinRequests } = useMyJoinRequests();

  // 管理者として所属しているチーム一覧
  const adminTeams = teams?.filter((team) => team.role === "admin") || [];

  // 各チームの承認待ち申請数を取得（最初の管理者チームのみ簡単実装）
  const firstAdminTeam = adminTeams[0];
  const { data: joinRequests } = useJoinRequests(firstAdminTeam?.customUrl);

  // 管理者向け：承認待ち申請数
  const pendingRequestsCount = joinRequests?.requests.length || 0;

  // 申請者向け：承認された申請のみカウント（拒否は通知しない）
  const approvedRequests =
    myJoinRequests?.requests.filter(
      (request) => request.status === "approved",
    ) || [];

  // 最後に確認した申請IDを取得（localStorage）
  const lastReadRequestId =
    typeof window !== "undefined"
      ? parseInt(localStorage.getItem("lastReadRequestId") || "0")
      : 0;

  // 未読の承認申請をカウント
  const unreadApprovedRequests = approvedRequests.filter(
    (request) => request.id > lastReadRequestId,
  );
  const myProcessedRequestsCount = unreadApprovedRequests.length > 0 ? 1 : 0;

  // 通知がある場合のみデバッグログ（ノイズ削減）
  if (pendingRequestsCount > 0 || myProcessedRequestsCount > 0) {
    console.log("🔔 通知あり:", {
      pendingRequestsCount,
      myProcessedRequestsCount,
      totalNotifications: pendingRequestsCount + myProcessedRequestsCount,
    });
  }

  // 通知を既読にする関数
  const markNotificationsAsRead = useCallback(() => {
    if (approvedRequests.length > 0) {
      const latestRequestId = Math.max(
        ...approvedRequests.map((req) => req.id),
      );
      if (typeof window !== "undefined") {
        localStorage.setItem("lastReadRequestId", latestRequestId.toString());
        console.log(
          `✅ 通知を既読にしました: lastReadRequestId=${latestRequestId}`,
        );
      }
    }
  }, [approvedRequests]);

  // 合計通知数（管理者向け承認待ち + 申請者向け処理済み）
  const totalNotifications = pendingRequestsCount + myProcessedRequestsCount;

  return {
    totalCount: totalNotifications,
    teamRequestsCount: pendingRequestsCount,
    myProcessedCount: myProcessedRequestsCount,
    adminTeamsCount: adminTeams.length,
    markNotificationsAsRead,
  };
}

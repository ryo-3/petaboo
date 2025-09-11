import { useTeams } from "./use-teams";
import { useJoinRequests } from "./use-join-requests";
import { useMyJoinRequests } from "./use-my-join-requests";

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

  // 申請者向け：ペンディング状態の申請数（未読通知の代わり）
  const myPendingRequestsCount =
    myJoinRequests?.requests?.filter((req) => req.status === "pending")
      .length || 0;

  // 合計通知数
  const totalNotifications = pendingRequestsCount + myPendingRequestsCount;

  return {
    totalCount: totalNotifications,
    teamRequestsCount: pendingRequestsCount,
    myPendingCount: myPendingRequestsCount,
    adminTeamsCount: adminTeams.length,
  };
}

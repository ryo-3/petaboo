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

  // 申請者向け：現時点では通知不要（将来的に未読フラグ実装時に対応）
  const myProcessedRequestsCount = 0;

  // 合計通知数（管理者向けの承認待ち申請のみ）
  const totalNotifications = pendingRequestsCount;

  return {
    totalCount: totalNotifications,
    teamRequestsCount: pendingRequestsCount,
    myProcessedCount: myProcessedRequestsCount,
    adminTeamsCount: adminTeams.length,
  };
}

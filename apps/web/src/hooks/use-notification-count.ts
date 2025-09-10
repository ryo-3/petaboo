import { useTeams } from "./use-teams";
import { useJoinRequests } from "./use-join-requests";

export function useNotificationCount() {
  const { data: teams } = useTeams();

  // 管理者として所属しているチーム一覧
  const adminTeams = teams?.filter((team) => team.role === "admin") || [];

  // 各チームの承認待ち申請数を取得（最初の管理者チームのみ簡単実装）
  const firstAdminTeam = adminTeams[0];
  const { data: joinRequests } = useJoinRequests(firstAdminTeam?.customUrl);

  // 未読通知数を計算
  const pendingRequestsCount = joinRequests?.requests.length || 0;

  // TODO: 他の通知タイプも追加予定
  // - 自分の申請が承認/拒否された通知
  // - メンション通知
  // - システム通知など

  const totalNotifications = pendingRequestsCount;

  return {
    totalCount: totalNotifications,
    teamRequestsCount: pendingRequestsCount,
    adminTeamsCount: adminTeams.length,
  };
}

import { useTeams } from "./use-teams";
import { useJoinRequests } from "./use-join-requests";
// import { useMyJoinRequests } from "./use-my-join-requests"; // TODO: 未読フラグ実装時に使用

/**
 * チーム関連の通知数を取得するフック
 */
export function useTeamNotificationCount() {
  const { data: teams } = useTeams();
  // const { data: myJoinRequests } = useMyJoinRequests(); // TODO: 未読フラグ実装時に使用

  // 管理者として所属しているチーム一覧
  const adminTeams = teams?.filter((team) => team.role === "admin") || [];

  // 各チームの承認待ち申請数を取得
  const { data: joinRequests } = useJoinRequests(adminTeams[0]?.customUrl);

  // 管理者向け通知: 承認待ち申請数
  const pendingRequestsCount = joinRequests?.requests.length || 0;

  // 申請者向け通知: 申請状況の変更（承認・拒否）があった数
  // TODO: 未読フラグを実装して実際の未読数を計算
  const myUpdatedRequestsCount = 0; // 暫定的に0

  const totalTeamNotifications = pendingRequestsCount + myUpdatedRequestsCount;

  return {
    totalCount: totalTeamNotifications,
    adminRequestsCount: pendingRequestsCount, // 管理者として承認待ち申請数
    myUpdatedRequestsCount, // 申請者として状況変更通知数
    isAdmin: adminTeams.length > 0,
  };
}

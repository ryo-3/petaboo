"use client";

import { useSimpleTeamNotifier } from "@/src/hooks/use-simple-team-notifier";
import { useJoinRequests } from "@/src/hooks/use-join-requests";
import { usePageVisibility } from "@/src/contexts/PageVisibilityContext";
import { Bell, Users, Clock, Check, ArrowRight, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

// 通知タイプごとの移動先を定義
const NOTIFICATION_DESTINATIONS = {
  team_requests: "team-list", // チーム申請管理タブ
  // 将来追加予定
  member_activity: "memos",
  board_activity: "boards",
  team_settings: "team-settings",
} as const;

type NotificationType = keyof typeof NOTIFICATION_DESTINATIONS;

interface NotificationListProps {
  teamName?: string;
  className?: string;
  notificationType?: NotificationType;
}

function NotificationList({
  teamName,
  className = "",
  notificationType = "team_requests",
}: NotificationListProps) {
  const { isVisible, isMouseActive } = usePageVisibility();
  const router = useRouter();

  // チーム通知を取得（チーム名が指定されている場合のみ）
  const teamNotifier = useSimpleTeamNotifier(
    teamName,
    isVisible,
    isMouseActive,
  );

  // 申請詳細データを取得
  const joinRequests = useJoinRequests(
    teamName,
    teamNotifier.data?.hasNotifications,
    isVisible,
    isMouseActive,
  );

  // 既読にする処理
  const handleMarkAsRead = () => {
    if (
      teamName &&
      teamNotifier.data?.hasNotifications &&
      !teamNotifier.data?.isRead
    ) {
      const readKey = `teamNotificationRead_${teamName}`;
      localStorage.setItem(readKey, new Date().toISOString());
      console.log(`🔔 通知を既読にしました: ${teamName}`);

      // 通知チェックを再実行して即座に反映
      if (teamNotifier.checkNow) {
        teamNotifier.checkNow();
      }
    }
  };

  // 通知タイプに応じた移動先を決定
  const getDestinationTab = (): string => {
    return NOTIFICATION_DESTINATIONS[notificationType];
  };

  // 通知に応じた画面に移動
  const handleGoToDestination = () => {
    if (teamName) {
      const tab = getDestinationTab();
      router.push(`/team/${teamName}?tab=${tab}`);
    }
  };

  // 通知がない場合（実際に通知データが存在しない場合のみ）
  if (!teamNotifier.data?.hasNotifications) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-gray-500" />
          <h2 className="text-[22px] font-bold text-gray-800">通知</h2>
        </div>
        <div className="text-center py-8">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">現在、新しい通知はありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <Bell
            className={`w-5 h-5 ${teamNotifier.data.isRead ? "text-gray-400" : "text-blue-600"}`}
          />
          <h2 className="text-[22px] font-bold text-gray-800">通知</h2>
          {!teamNotifier.data.isRead && (
            <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {teamNotifier.data.counts.teamRequests}
            </span>
          )}
          {teamNotifier.data.isRead && (
            <span className="bg-gray-300 text-gray-600 text-xs px-2 py-1 rounded-full">
              既読
            </span>
          )}
        </div>

        {/* 既読ボタン - 未読の場合のみ表示 */}
        {!teamNotifier.data.isRead && (
          <button
            onClick={handleMarkAsRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
            title="すべて既読にする"
          >
            <Check className="w-4 h-4" />
            既読にする
          </button>
        )}
      </div>

      <div className="px-6 pb-6">
        <div className="space-y-3">
          {teamName && teamNotifier.data?.hasNotifications && (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg border ${
                teamNotifier.data.isRead
                  ? "bg-gray-50 border-gray-200"
                  : "bg-blue-50 border-blue-200"
              }`}
            >
              <Users
                className={`w-5 h-5 mt-0.5 ${
                  teamNotifier.data.isRead ? "text-gray-400" : "text-blue-600"
                }`}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3
                    className={`font-medium ${
                      teamNotifier.data.isRead
                        ? "text-gray-600"
                        : "text-gray-900"
                    }`}
                  >
                    チーム参加申請
                  </h3>
                  {joinRequests.data?.requests &&
                  joinRequests.data.requests.length > 0 ? (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                      新規申請 ({joinRequests.data.requests.length}件)
                    </span>
                  ) : teamNotifier.data.isRead ? (
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                      確認済み
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      新規通知
                    </span>
                  )}
                </div>
                <p
                  className={`text-sm mb-2 ${
                    teamNotifier.data.isRead ? "text-gray-500" : "text-gray-600"
                  }`}
                >
                  {joinRequests.data?.requests &&
                  joinRequests.data.requests.length > 0 ? (
                    <>
                      <strong>{teamName}</strong> チームに
                      {joinRequests.data.requests.length}件の参加申請があります
                      {joinRequests.data.requests.length === 1 &&
                        joinRequests.data.requests[0]?.displayName && (
                          <span className="text-gray-500">
                            {" "}
                            ({joinRequests.data.requests[0].displayName}さん)
                          </span>
                        )}
                    </>
                  ) : (
                    <>
                      <strong>{teamName}</strong> チームの申請通知
                    </>
                  )}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {joinRequests.data?.requests &&
                      joinRequests.data.requests.length > 0 &&
                      joinRequests.data.requests[0]
                        ? `最新申請: ${new Date(
                            joinRequests.data.requests[0].createdAt * 1000,
                          ).toLocaleString("ja-JP", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : teamNotifier.data.lastCheckedAt
                          ? new Date(
                              teamNotifier.data.lastCheckedAt,
                            ).toLocaleString("ja-JP", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "今"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    {/* 申請がある場合は移動ボタンのみ表示、申請がない場合は既読ボタンも表示 */}
                    {joinRequests.data?.requests &&
                    joinRequests.data.requests.length > 0 ? (
                      <>
                        <button
                          onClick={handleGoToDestination}
                          className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
                          title="申請管理画面に移動"
                        >
                          <ArrowRight className="w-4 h-4" />
                          申請を確認
                        </button>
                      </>
                    ) : (
                      <>
                        {!teamNotifier.data.isRead && (
                          <button
                            onClick={handleMarkAsRead}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300 rounded-md transition-all duration-200 shadow-sm hover:shadow"
                            title="この通知を既読にする"
                          >
                            <Check className="w-3 h-3" />
                            既読にする
                          </button>
                        )}
                        <button
                          onClick={handleGoToDestination}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 rounded-md transition-all duration-200 shadow-sm hover:shadow"
                          title="申請管理画面に移動"
                        >
                          <ArrowRight className="w-3 h-3" />
                          移動
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationList;

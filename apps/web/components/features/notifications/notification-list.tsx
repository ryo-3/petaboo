"use client";

import { useSimpleTeamNotifier } from "@/src/hooks/use-simple-team-notifier";
import { usePageVisibility } from "@/src/contexts/PageVisibilityContext";
import { Bell, Users, Clock, Check, ArrowRight, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

interface NotificationListProps {
  teamName?: string;
  className?: string;
}

function NotificationList({ teamName, className = "" }: NotificationListProps) {
  const { isVisible, isMouseActive } = usePageVisibility();
  const router = useRouter();

  // チーム通知を取得（チーム名が指定されている場合のみ）
  const teamNotifier = useSimpleTeamNotifier(
    teamName,
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

  // チーム設定画面（申請管理）に移動
  const handleGoToTeamSettings = () => {
    if (teamName) {
      router.push(`/team/${teamName}?tab=team-settings`);
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
                  {!teamNotifier.data.isRead ? (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                      新規
                    </span>
                  ) : (
                    <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                      既読済み
                    </span>
                  )}
                </div>
                <p
                  className={`text-sm mb-2 ${
                    teamNotifier.data.isRead ? "text-gray-500" : "text-gray-600"
                  }`}
                >
                  <strong>{teamName}</strong> チームに新しい参加申請があります
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {teamNotifier.data.lastCheckedAt
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
                    {/* 個別既読ボタン - 未読の場合のみ表示 */}
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

                    {/* 申請管理画面への移動ボタン */}
                    <button
                      onClick={handleGoToTeamSettings}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 rounded-md transition-all duration-200 shadow-sm hover:shadow"
                      title="申請を管理する"
                    >
                      <ArrowRight className="w-3 h-3" />
                      移動
                    </button>
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

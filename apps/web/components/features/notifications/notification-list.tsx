"use client";

import { useSimpleTeamNotifier } from "@/src/hooks/use-simple-team-notifier";
import { useJoinRequests } from "@/src/hooks/use-join-requests";
import {
  useNotifications,
  useMarkNotificationAsRead,
} from "@/src/hooks/use-notifications";
import { useTeamContextSafe } from "@/contexts/team-context";
import { usePageVisibility } from "@/src/contexts/PageVisibilityContext";
import { Bell, Users, Clock, ArrowRight, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { Notification } from "@/lib/api/notifications";

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
  const { isVisible } = usePageVisibility();
  const router = useRouter();
  const teamContext = useTeamContextSafe();
  const teamId = teamContext?.teamId || undefined;

  // チーム通知を取得（チーム名が指定されている場合のみ）
  const teamNotifier = useSimpleTeamNotifier(teamName, isVisible);

  // 申請詳細データを取得
  const joinRequests = useJoinRequests(
    teamName,
    teamNotifier.data?.hasNotifications,
    isVisible,
  );

  // コメント通知を取得
  const { data: commentNotifications } = useNotifications(teamId);
  const { mutate: markAsRead } = useMarkNotificationAsRead();

  // 承認申請は処理するまで表示し続ける（既読システムは使わない）

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

  // 通知から適切なURLを生成
  const getNotificationUrl = (notification: Notification): string | null => {
    if (!teamName) return null;

    const { targetType, targetOriginalId, boardOriginalId } = notification;

    if (!targetType || !targetOriginalId) {
      return `/team/${teamName}`;
    }

    // boardOriginalIdがない場合はチームホームに戻る
    if (!boardOriginalId) {
      return `/team/${teamName}`;
    }

    // ボードへのコメント
    if (targetType === "board") {
      return `/team/${teamName}/board/${boardOriginalId}`;
    }

    // メモへのコメント - ボード画面でそのメモを開く
    if (targetType === "memo") {
      return `/team/${teamName}/board/${boardOriginalId}/memo/${targetOriginalId}`;
    }

    // タスクへのコメント - ボード画面でそのタスクを開く
    if (targetType === "task") {
      return `/team/${teamName}/board/${boardOriginalId}/task/${targetOriginalId}`;
    }

    return `/team/${teamName}`;
  };

  // コメント通知クリック時の処理
  const handleCommentClick = (notification: Notification) => {
    // 既読にする
    if (notification.isRead === 0) {
      markAsRead(notification.id);
    }

    // 適切な画面に遷移
    const url = getNotificationUrl(notification);
    if (url) {
      router.push(url);
    }
  };

  // 通知の合計数を計算
  const hasTeamNotifications = teamNotifier.data?.hasNotifications || false;
  const hasCommentNotifications =
    (commentNotifications?.notifications.length || 0) > 0;
  const totalNotifications =
    (teamNotifier.data?.counts.teamRequests || 0) +
    (commentNotifications?.unreadCount || 0);

  // 通知がない場合（実際に通知データが存在しない場合のみ）
  if (!hasTeamNotifications && !hasCommentNotifications) {
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
          <Bell className="w-5 h-5 text-blue-600" />
          <h2 className="text-[22px] font-bold text-gray-800">通知</h2>
          {totalNotifications > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {totalNotifications}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="space-y-3">
          {/* コメント通知 */}
          {commentNotifications &&
            commentNotifications.notifications.length > 0 &&
            commentNotifications.notifications.map((notification) => (
              <CommentNotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => handleCommentClick(notification)}
              />
            ))}

          {/* チーム参加申請通知 */}
          {teamName && teamNotifier.data?.hasNotifications && (
            <div className="flex items-start gap-3 p-4 rounded-lg border bg-orange-50 border-orange-200">
              <Users className="w-5 h-5 mt-0.5 text-orange-600" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900">チーム参加申請</h3>
                  {joinRequests.data?.requests &&
                  joinRequests.data.requests.length > 0 ? (
                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                      承認待ち ({joinRequests.data.requests.length}件)
                    </span>
                  ) : (
                    <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full">
                      申請通知
                    </span>
                  )}
                </div>
                <p className="text-sm mb-2 text-gray-600">
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
                    <button
                      onClick={handleGoToDestination}
                      className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded-md transition-all duration-200 shadow-sm hover:shadow-md"
                      title="申請管理画面に移動"
                    >
                      <ArrowRight className="w-4 h-4" />
                      {joinRequests.data?.requests &&
                      joinRequests.data.requests.length > 0
                        ? "申請を確認"
                        : "管理画面へ"}
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

// コメント通知アイテムコンポーネント
interface CommentNotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

function CommentNotificationItem({
  notification,
  onClick,
}: CommentNotificationItemProps) {
  const isUnread = notification.isRead === 0;
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <div
      onClick={onClick}
      className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors hover:bg-gray-50 ${
        isUnread ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
      }`}
    >
      {/* アイコン */}
      <div
        className={`p-2 rounded-lg flex-shrink-0 ${
          isUnread ? "bg-blue-100" : "bg-gray-100"
        }`}
      >
        <MessageSquare
          className={`w-4 h-4 ${isUnread ? "text-blue-600" : "text-gray-500"}`}
        />
      </div>

      {/* 通知内容 */}
      <div className="flex-1 min-w-0">
        {/* メッセージ */}
        <p
          className={`text-sm mb-1 ${isUnread ? "font-semibold text-gray-900" : "text-gray-700"}`}
        >
          {notification.message}
        </p>

        {/* 投稿者と時刻 */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {notification.actorDisplayName || "誰か"}
          </span>
          <span className="text-xs text-gray-400">•</span>
          <span className="text-xs text-gray-500">{timeAgo}</span>
        </div>

        {/* ターゲット情報 */}
        {notification.targetType && (
          <div className="mt-1">
            <span className="text-xs text-gray-400">
              {notification.targetType === "board"
                ? "ボード"
                : notification.targetType === "memo"
                  ? "メモ"
                  : "タスク"}
              へのコメント
            </span>
          </div>
        )}
      </div>

      {/* 未読バッジ */}
      {isUnread && (
        <div className="flex-shrink-0 mt-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        </div>
      )}
    </div>
  );
}

export default NotificationList;

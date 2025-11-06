"use client";

import {
  useNotifications,
  useMarkNotificationAsRead,
} from "@/src/hooks/use-notifications";
import { useTeamContextSafe } from "@/contexts/team-context";
import { Bell, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { Notification } from "@/lib/api/notifications";

interface CommentNotificationListProps {
  className?: string;
}

export default function CommentNotificationList({
  className = "",
}: CommentNotificationListProps) {
  const router = useRouter();
  const teamContext = useTeamContextSafe();
  const teamId = teamContext?.teamId || undefined;

  // コメント通知を取得
  const { data: notificationData } = useNotifications(teamId);
  const { mutate: markAsRead } = useMarkNotificationAsRead();

  // 通知クリック時の処理
  const handleNotificationClick = (notification: Notification) => {
    // 既読にする
    if (notification.isRead === 0) {
      markAsRead(notification.id);
    }

    // TODO: 通知の種類に応じて適切な画面に遷移
    // 今は単にホームに戻る
    if (teamContext?.teamSlug) {
      const baseTeamUrl = `/team/${teamContext.teamSlug}`;
      console.log("[CommentNotificationList] navigate", {
        notificationId: notification.id,
        url: baseTeamUrl,
      });
      router.push(baseTeamUrl);
    }
  };

  // 通知がない場合
  if (!notificationData || notificationData.notifications.length === 0) {
    return (
      <div className={`bg-white rounded-lg border p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <Bell className="w-5 h-5 text-gray-500" />
          <h2 className="text-[22px] font-bold text-gray-800">コメント通知</h2>
        </div>
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">コメント通知はありません</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-blue-600" />
          <h2 className="text-[22px] font-bold text-gray-800">コメント通知</h2>
          {notificationData.unreadCount > 0 && (
            <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
              {notificationData.unreadCount}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="space-y-2">
          {notificationData.notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClick={() => handleNotificationClick(notification)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
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

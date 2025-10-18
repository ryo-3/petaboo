"use client";

import { useRef, useEffect } from "react";
import { Notification } from "@/lib/api/notifications";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import { Bell, MessageSquare, X } from "lucide-react";

interface NotificationPopupProps {
  notifications: Notification[];
  isOpen: boolean;
  onClose: () => void;
  onNotificationClick: (notification: Notification) => void;
  onMarkAsRead: (notificationId: number) => void;
}

export default function NotificationPopup({
  notifications,
  isOpen,
  onClose,
  onNotificationClick,
  onMarkAsRead,
}: NotificationPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popupRef}
      className="absolute top-12 right-0 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col"
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-700" />
          <h3 className="font-semibold text-gray-900">通知</h3>
          {notifications.length > 0 && (
            <span className="text-sm text-gray-500">
              ({notifications.length})
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* 通知リスト */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          // 空の状態
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Bell className="w-12 h-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">通知はありません</p>
          </div>
        ) : (
          // 通知一覧
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onClick={() => onNotificationClick(notification)}
                onMarkAsRead={() => onMarkAsRead(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onMarkAsRead: () => void;
}

function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
}: NotificationItemProps) {
  const isUnread = notification.isRead === 0;
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 ${
        isUnread ? "bg-blue-50/50" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        {/* アイコン */}
        <div
          className={`p-2 rounded-lg ${
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
            className={`text-sm ${isUnread ? "font-semibold text-gray-900" : "text-gray-700"}`}
          >
            {notification.message}
          </p>

          {/* 投稿者と時刻 */}
          <div className="flex items-center gap-2 mt-1">
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
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          </div>
        )}
      </div>
    </div>
  );
}

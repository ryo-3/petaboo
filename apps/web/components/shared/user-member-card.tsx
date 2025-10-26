"use client";

import { formatDateOnly } from "@/src/utils/formatDate";
import { getUserAvatarColor } from "@/src/utils/userUtils";
import { Pencil } from "lucide-react";

interface UserMemberCardProps {
  userId: string;
  displayName?: string | null;
  joinedAt?: number;
  isCurrentUser?: boolean;
  showJoinDate?: boolean;
  avatarColor?: string | null; // チームメンバーからの色指定（オプション）
  className?: string;
  children?: React.ReactNode; // 右側のボタンエリア用
  onEditClick?: () => void; // 編集ボタンクリック時のコールバック
}

export default function UserMemberCard({
  userId,
  displayName,
  joinedAt,
  isCurrentUser = false,
  showJoinDate = true,
  avatarColor,
  className = "",
  children,
  onEditClick,
}: UserMemberCardProps) {
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded ${
        isCurrentUser ? "bg-blue-50" : "bg-gray-50"
      } ${className}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
          avatarColor || getUserAvatarColor(userId)
        }`}
      >
        {displayName
          ? displayName.charAt(0).toUpperCase()
          : userId.charAt(10).toUpperCase()}
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">
            {displayName || `ユーザー${userId.slice(-4)}`}
          </div>
          {isCurrentUser && onEditClick && (
            <button
              onClick={onEditClick}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <Pencil className="w-3 h-3 text-gray-500" />
            </button>
          )}
        </div>
        {showJoinDate && joinedAt && (
          <div className="text-xs text-gray-500">
            {formatDateOnly(joinedAt)}に参加
          </div>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

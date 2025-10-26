"use client";

import { useTeamActivities } from "@/src/hooks/use-team-activities";
import type { TeamActivity } from "@/src/hooks/use-team-activities";
import { formatDistanceToNow } from "@/src/utils/formatDate";
import {
  FileTextIcon,
  CheckSquareIcon,
  MessageSquareIcon,
  LayoutDashboardIcon,
  UserPlusIcon,
  UserMinusIcon,
} from "lucide-react";

interface ActivityFeedProps {
  customUrl: string;
  limit?: number;
}

// アクティビティタイプごとのアイコン
const getActivityIcon = (actionType: string) => {
  if (actionType.startsWith("memo_")) {
    return <FileTextIcon className="w-4 h-4" />;
  }
  if (actionType.startsWith("task_")) {
    return <CheckSquareIcon className="w-4 h-4" />;
  }
  if (actionType.startsWith("comment_")) {
    return <MessageSquareIcon className="w-4 h-4" />;
  }
  if (actionType.startsWith("board_")) {
    return <LayoutDashboardIcon className="w-4 h-4" />;
  }
  if (actionType === "member_joined") {
    return <UserPlusIcon className="w-4 h-4" />;
  }
  if (actionType === "member_left") {
    return <UserMinusIcon className="w-4 h-4" />;
  }
  return <FileTextIcon className="w-4 h-4" />;
};

// アクティビティタイプごとの色
const getActivityColor = (actionType: string): string => {
  if (actionType.includes("created") || actionType === "member_joined") {
    return "text-green-600";
  }
  if (actionType.includes("deleted") || actionType === "member_left") {
    return "text-red-600";
  }
  if (actionType.includes("updated") || actionType.includes("status_changed")) {
    return "text-blue-600";
  }
  if (actionType.includes("comment")) {
    return "text-purple-600";
  }
  return "text-gray-600";
};

// アクティビティメッセージを生成
const getActivityMessage = (activity: TeamActivity): string => {
  const { actionType, targetType, targetTitle } = activity;

  const titlePart = targetTitle ? `「${targetTitle}」` : "";

  switch (actionType) {
    case "memo_created":
      return `メモ${titlePart}を作成しました`;
    case "memo_updated":
      return `メモ${titlePart}を更新しました`;
    case "memo_deleted":
      return `メモ${titlePart}を削除しました`;
    case "task_created":
      return `タスク${titlePart}を作成しました`;
    case "task_updated":
      return `タスク${titlePart}を更新しました`;
    case "task_status_changed":
      return `タスク${titlePart}のステータスを変更しました`;
    case "task_deleted":
      return `タスク${titlePart}を削除しました`;
    case "comment_created":
      return `${targetType}${titlePart}にコメントしました`;
    case "comment_deleted":
      return `${targetType}${titlePart}のコメントを削除しました`;
    case "board_item_added":
      return `ボードにアイテムを追加しました`;
    case "board_item_removed":
      return `ボードからアイテムを削除しました`;
    case "member_joined":
      return `チームに参加しました`;
    case "member_left":
      return `チームから退出しました`;
    default:
      return `アクションを実行しました`;
  }
};

export function ActivityFeed({ customUrl, limit = 20 }: ActivityFeedProps) {
  const {
    data: activities,
    isLoading,
    error,
  } = useTeamActivities(customUrl, limit);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-sm text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-sm text-red-500">
          アクティビティの取得に失敗しました
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-sm text-gray-500">
          まだアクティビティがありません
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {/* アイコン */}
          <div className={`mt-0.5 ${getActivityColor(activity.actionType)}`}>
            {getActivityIcon(activity.actionType)}
          </div>

          {/* コンテンツ */}
          <div className="flex-1 min-w-0">
            <div className="text-sm text-gray-900">
              <span className="font-medium">{activity.userId}</span>{" "}
              <span className="text-gray-600">
                {getActivityMessage(activity)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(activity.createdAt)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

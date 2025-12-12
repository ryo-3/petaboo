"use client";

import { useState, useEffect, useRef } from "react";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask, TaskStatus } from "@/src/types/task";
import { formatDate } from "@/src/utils/formatDate";
import { useTaskStatusHistory } from "@/src/hooks/use-task-status-history";
import { getTaskTabLabel } from "@/src/config/taskTabConfig";
import { getStatusColor } from "@/src/utils/taskUtils";
import Tooltip from "@/components/ui/base/tooltip";

interface DateInfoProps {
  item?: Memo | Task | DeletedMemo | DeletedTask | null;
  createdItemId?: number | null;
  isEditing?: boolean;
  lastEditedAt?: number | null;
  size?: "sm" | "md";
  // タスクのステータス表示用（オプション）
  showStatus?: boolean;
  teamMode?: boolean;
  teamId?: number;
  // アバター表示用（「作成」と日時の間に表示）
  avatar?: React.ReactNode;
}

// ステータス変更日時のフォーマット
// 今年なら「MM/DD HH:mm」、違う年なら「YY/MM/DD HH:mm」
function formatStatusDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const isSameYear = date.getFullYear() === now.getFullYear();

  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  if (isSameYear) {
    return `${month}/${day} ${hours}:${minutes}`;
  }
  const year = date.getFullYear().toString().slice(-2);
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// 履歴モーダル用（常に年を表示）
function formatHistoryDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// ステータス表示部分を別コンポーネントに（Hydration対策）
function StatusDisplay({
  taskId,
  currentStatus,
  teamMode,
  teamId,
  completedAt,
}: {
  taskId: number | null;
  currentStatus: string;
  teamMode: boolean;
  teamId?: number;
  completedAt?: number | null;
}) {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 外側クリックで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const { data: history } = useTaskStatusHistory({
    taskId,
    teamMode,
    teamId,
    enabled: isMounted && taskId !== null,
  });

  const latestStatusChange = history && history.length > 0 ? history[0] : null;

  // 履歴がある場合は最新の履歴のステータスを使用、なければ現在のステータス
  const displayStatus = latestStatusChange
    ? latestStatusChange.toStatus
    : currentStatus;

  // 完了タスクの場合は完了日時を表示（completedAtを優先）
  const isCompleted = currentStatus === "completed";
  const completedDateTime = isCompleted
    ? completedAt || latestStatusChange?.changedAt
    : null;

  return (
    <span className="relative flex items-center gap-1.5">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 hover:opacity-70 transition-opacity cursor-pointer"
      >
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] ${getStatusColor(displayStatus)}`}
        >
          {getTaskTabLabel(displayStatus as TaskStatus)}
        </span>
        {isMounted &&
          latestStatusChange &&
          teamMode &&
          latestStatusChange.userName && (
            <Tooltip text={latestStatusChange.userName} position="top">
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-medium text-xs ${
                  latestStatusChange.userAvatarColor || "bg-blue-500"
                }`}
              >
                {latestStatusChange.userName.charAt(0).toUpperCase()}
              </div>
            </Tooltip>
          )}
        {isMounted &&
          (isCompleted ? completedDateTime : latestStatusChange) && (
            <span className="text-gray-400">
              {formatStatusDateTime(
                isCompleted && completedDateTime
                  ? completedDateTime
                  : latestStatusChange!.changedAt,
              )}
            </span>
          )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[280px] max-w-[360px]"
        >
          <div className="p-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-700">
              ステータス履歴
            </span>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {!history || history.length === 0 ? (
              <div className="text-xs text-gray-500 p-3 text-center">
                履歴がありません
              </div>
            ) : (
              <div className="p-2 space-y-1.5">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${getStatusColor(item.toStatus)}`}
                    >
                      {getTaskTabLabel(item.toStatus)}
                    </span>
                    <span className="text-gray-600 whitespace-nowrap">
                      {formatHistoryDateTime(item.changedAt)}
                    </span>
                    {teamMode && item.userName && (
                      <span className="text-gray-400 truncate">
                        {item.userName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

function DateInfo({
  item,
  createdItemId,
  isEditing: _isEditing = false,
  lastEditedAt,
  size = "md",
  showStatus = false,
  teamMode = false,
  teamId,
  avatar,
}: DateInfoProps) {
  // タスクかどうかを判定（statusプロパティがあればタスク）
  const isTask = item && "status" in item;
  const taskId = isTask && item.id ? item.id : null;

  if (!item) {
    return null;
  }

  // 最新の編集時間を決定（propsの編集時間 vs API更新時間）
  const latestEditTime =
    lastEditedAt && lastEditedAt > (item.updatedAt || 0)
      ? lastEditedAt
      : item.updatedAt;

  // 新規作成時または実際に編集されていない場合は編集時間を表示しない
  const showEditTime =
    !createdItemId &&
    latestEditTime &&
    latestEditTime !== item.createdAt &&
    item.updatedAt !== item.createdAt;

  const textSizeClass =
    size === "sm" ? "text-[12px]" : "text-[12px] md:text-[14px]";
  const gapClass = size === "sm" ? "gap-3" : "gap-4";

  const currentStatus = isTask ? (item as Task | DeletedTask).status : null;

  return (
    <div className={`${textSizeClass} text-gray-500`}>
      <div className={`flex ${gapClass} items-center`}>
        <span className="flex items-center gap-1">
          <span>作成</span>
          {avatar}
          <span>{formatDate(item.createdAt)}</span>
        </span>
        {showEditTime && (
          <span className="flex items-center gap-1">
            <span>編集</span>
            {/* 編集者のアバター表示 */}
            {teamMode && "updatedByName" in item && item.updatedByName && (
              <Tooltip text={item.updatedByName} position="top">
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-white font-medium text-xs ${
                    ("updatedByAvatarColor" in item &&
                      item.updatedByAvatarColor) ||
                    "bg-blue-500"
                  }`}
                >
                  {item.updatedByName.charAt(0).toUpperCase()}
                </div>
              </Tooltip>
            )}
            <span>{formatDate(latestEditTime)}</span>
          </span>
        )}
        {showStatus && isTask && currentStatus && (
          <StatusDisplay
            taskId={taskId}
            currentStatus={currentStatus}
            teamMode={teamMode}
            teamId={teamId}
            completedAt={"completedAt" in item ? item.completedAt : undefined}
          />
        )}
      </div>
    </div>
  );
}

export default DateInfo;

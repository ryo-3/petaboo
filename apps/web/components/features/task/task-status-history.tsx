"use client";

import { useState, useRef, useEffect } from "react";
import { History } from "lucide-react";
import { useTaskStatusHistory } from "@/src/hooks/use-task-status-history";
import {
  getTaskTabLabel,
  getTaskStatusColor,
} from "@/src/config/taskTabConfig";

interface TaskStatusHistoryProps {
  taskId: number | null;
  teamMode?: boolean;
  teamId?: number;
}

// 日時フォーマット（MM/DD HH:mm形式）
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${month}/${day} ${hours}:${minutes}`;
}

export function TaskStatusHistory({
  taskId,
  teamMode = false,
  teamId,
}: TaskStatusHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { data: history, isLoading } = useTaskStatusHistory({
    taskId,
    teamMode,
    teamId,
    enabled: isOpen && taskId !== null,
  });

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

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-0.5 text-[13px] text-gray-700 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
      >
        <History size={14} />
        <span>ステータス履歴</span>
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute bottom-full left-0 mb-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px] max-w-[280px]"
        >
          <div className="p-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-700">
              ステータス履歴
            </span>
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {isLoading ? (
              <div className="text-xs text-gray-500 p-3 text-center">
                読み込み中...
              </div>
            ) : !history || history.length === 0 ? (
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
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getTaskStatusColor(item.toStatus)} ${
                        item.toStatus === "completed"
                          ? "text-white"
                          : "text-gray-700"
                      }`}
                    >
                      {getTaskTabLabel(item.toStatus)}
                    </span>
                    <span className="text-gray-600 whitespace-nowrap">
                      {formatDateTime(item.changedAt)}
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
    </div>
  );
}

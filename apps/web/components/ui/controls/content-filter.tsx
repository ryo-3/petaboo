import React from "react";
import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import { List, FileText } from "lucide-react";
import Tooltip from "@/components/ui/base/tooltip";

interface ContentFilterProps {
  showMemo: boolean;
  showTask: boolean;
  showComment?: boolean;
  onMemoToggle: (show: boolean) => void;
  onTaskToggle: (show: boolean) => void;
  onCommentToggle?: (show: boolean) => void;
  rightPanelMode?: "memo-list" | "task-list" | "editor" | null;
  // 選択時モード用
  isSelectedMode?: boolean;
  listTooltip?: string;
  detailTooltip?: string;
  selectedItemType?: "memo" | "task" | null; // 選択中のアイテムタイプ
}

function ContentFilter({
  showMemo,
  showTask,
  showComment,
  onMemoToggle,
  onTaskToggle,
  onCommentToggle,
  rightPanelMode,
  isSelectedMode = false,
  listTooltip,
  detailTooltip,
  selectedItemType = null,
}: ContentFilterProps) {
  const getMemoTooltip = () => {
    if (isSelectedMode && listTooltip) {
      return listTooltip;
    }
    if (rightPanelMode === "task-list") {
      return "メモ一覧を表示";
    }
    return showMemo ? "メモを非表示" : "メモを表示";
  };

  const getTaskTooltip = () => {
    if (isSelectedMode && detailTooltip) {
      return detailTooltip;
    }
    if (rightPanelMode === "memo-list") {
      return "タスク一覧を表示";
    }
    return showTask ? "タスクを非表示" : "タスクを表示";
  };

  const getCommentTooltip = () => {
    return showComment ? "コメントを非表示" : "コメントを表示";
  };

  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5 gap-1">
      {/* 左ボタン（非選択時: メモ、選択時: 一覧） */}
      <Tooltip text={getMemoTooltip()} position="bottom">
        <button
          onClick={() => onMemoToggle(!showMemo)}
          className={`p-1 rounded-md transition-colors ${
            showMemo
              ? isSelectedMode && selectedItemType === "task"
                ? "bg-DeepBlue text-white hover:bg-DeepBlue/80"
                : "bg-Green text-white hover:bg-Green/80"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
          }`}
        >
          {isSelectedMode ? (
            <List className="w-4 h-4" />
          ) : (
            <MemoIcon className="w-4 h-4" />
          )}
        </button>
      </Tooltip>

      {/* 中央ボタン（非選択時: タスク、選択時: 詳細） */}
      <Tooltip text={getTaskTooltip()} position="bottom">
        <button
          onClick={() => onTaskToggle(!showTask)}
          className={`p-1 rounded-md transition-colors ${
            showTask
              ? isSelectedMode && selectedItemType === "memo"
                ? "bg-Green text-white hover:bg-Green/80"
                : "bg-DeepBlue text-white hover:bg-DeepBlue/80"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
          }`}
        >
          {isSelectedMode ? (
            selectedItemType === "memo" ? (
              <MemoIcon className="w-4 h-4" />
            ) : (
              <TaskIcon className="w-4 h-4" />
            )
          ) : (
            <TaskIcon className="w-4 h-4" />
          )}
        </button>
      </Tooltip>

      {/* コメントフィルター（チームモードのみ） */}
      {showComment !== undefined && onCommentToggle && (
        <Tooltip text={getCommentTooltip()} position="bottom">
          <button
            onClick={() => onCommentToggle(!showComment)}
            className={`p-1 rounded-md transition-colors ${
              showComment
                ? "bg-gray-500 text-white hover:bg-gray-600"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
            }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </button>
        </Tooltip>
      )}
    </div>
  );
}

export default ContentFilter;

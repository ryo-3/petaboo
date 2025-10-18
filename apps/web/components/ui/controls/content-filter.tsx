import React from "react";
import MemoIcon from "@/components/icons/memo-icon";
import TaskIcon from "@/components/icons/task-icon";
import { MessageSquare } from "lucide-react";
import Tooltip from "@/components/ui/base/tooltip";

interface ContentFilterProps {
  showMemo: boolean;
  showTask: boolean;
  showComment?: boolean;
  onMemoToggle: (show: boolean) => void;
  onTaskToggle: (show: boolean) => void;
  onCommentToggle?: (show: boolean) => void;
  rightPanelMode?: "memo-list" | "task-list" | "editor" | null;
}

function ContentFilter({
  showMemo,
  showTask,
  showComment,
  onMemoToggle,
  onTaskToggle,
  onCommentToggle,
  rightPanelMode,
}: ContentFilterProps) {
  const getMemoTooltip = () => {
    if (rightPanelMode === "task-list") {
      return "メモ一覧を表示";
    }
    return showMemo ? "メモを非表示" : "メモを表示";
  };

  const getTaskTooltip = () => {
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
      {/* メモフィルター */}
      <Tooltip text={getMemoTooltip()} position="bottom">
        <button
          onClick={() => onMemoToggle(!showMemo)}
          className={`p-1 rounded-md transition-colors ${
            showMemo
              ? "bg-Green text-white hover:bg-Green/80"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
          }`}
        >
          <MemoIcon className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* タスクフィルター */}
      <Tooltip text={getTaskTooltip()} position="bottom">
        <button
          onClick={() => onTaskToggle(!showTask)}
          className={`p-1 rounded-md transition-colors ${
            showTask
              ? "bg-DeepBlue text-white hover:bg-DeepBlue/80"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-200"
          }`}
        >
          <TaskIcon className="w-4 h-4" />
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
            <MessageSquare className="w-4 h-4" />
          </button>
        </Tooltip>
      )}
    </div>
  );
}

export default ContentFilter;

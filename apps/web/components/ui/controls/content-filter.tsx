import React from 'react';
import MemoIcon from '@/components/icons/memo-icon';
import TaskIcon from '@/components/icons/task-icon';
import Tooltip from '@/components/ui/base/tooltip';

interface ContentFilterProps {
  showMemo: boolean;
  showTask: boolean;
  onMemoToggle: (show: boolean) => void;
  onTaskToggle: (show: boolean) => void;
}

function ContentFilter({
  showMemo,
  showTask,
  onMemoToggle,
  onTaskToggle,
}: ContentFilterProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5 gap-1">
      {/* メモフィルター */}
      <Tooltip 
        text={showMemo ? "メモを非表示" : "メモを表示"} 
        position="bottom"
      >
        <button
          onClick={() => onMemoToggle(!showMemo)}
          className={`p-1 rounded-md transition-colors ${
            showMemo 
              ? "text-gray-700" 
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <MemoIcon className="w-4 h-4" />
        </button>
      </Tooltip>

      {/* タスクフィルター */}
      <Tooltip 
        text={showTask ? "タスクを非表示" : "タスクを表示"} 
        position="bottom"
      >
        <button
          onClick={() => onTaskToggle(!showTask)}
          className={`p-1 rounded-md transition-colors ${
            showTask 
              ? "text-gray-700" 
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          <TaskIcon className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
}

export default ContentFilter;
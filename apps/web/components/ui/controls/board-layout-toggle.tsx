import React from 'react';
import Tooltip from '@/components/ui/base/tooltip';

interface BoardLayoutToggleProps {
  boardLayout: "horizontal" | "vertical";
  onBoardLayoutChange: (layout: "horizontal" | "vertical") => void;
  buttonSize?: string;
  iconSize?: string;
}

function BoardLayoutToggle({
  boardLayout,
  onBoardLayoutChange,
  buttonSize = "size-7",
  iconSize = "size-5",
}: BoardLayoutToggleProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5">
      {/* 横並びボタン */}
      <Tooltip text="横並び表示" position="bottom">
        <button
          onClick={() => onBoardLayoutChange("horizontal")}
          className={`${buttonSize} rounded-md flex items-center justify-center transition-colors ${
            boardLayout === "horizontal"
              ? "text-gray-500"
              : "text-gray-400 hover:text-gray-500"
          }`}
        >
          <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
            <rect x="5" y="4" width="5" height="16" rx="1" />
            <rect x="14" y="4" width="5" height="16" rx="1" />
          </svg>
        </button>
      </Tooltip>

      {/* 縦並びボタン */}
      <Tooltip text="縦並び表示" position="bottom">
        <button
          onClick={() => onBoardLayoutChange("vertical")}
          className={`${buttonSize} rounded-md flex items-center justify-center transition-colors ${
            boardLayout === "vertical"
              ? "text-gray-500"
              : "text-gray-400 hover:text-gray-500"
          }`}
        >
          <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="5" width="16" height="5" rx="1" />
            <rect x="4" y="14" width="16" height="5" rx="1" />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}

export default BoardLayoutToggle;
import React from 'react';
import Tooltip from '@/components/ui/base/tooltip';

interface BoardLayoutToggleProps {
  boardLayout: "horizontal" | "vertical";
  isReversed?: boolean;
  onBoardLayoutChange: (layout: "horizontal" | "vertical") => void;
  buttonSize?: string;
  iconSize?: string;
}

function BoardLayoutToggle({
  boardLayout,
  isReversed = false,
  onBoardLayoutChange,
  buttonSize = "size-7",
  iconSize = "size-5",
}: BoardLayoutToggleProps) {
  return (
    <div className="flex rounded-lg p-0.5">
      {/* 横並びボタン */}
      <Tooltip 
        text={boardLayout === "horizontal" && isReversed ? "メモとタスクを反転" : boardLayout === "horizontal" ? "メモとタスクを反転" : "横並び表示"} 
        position="bottom"
      >
        <button
          onClick={() => onBoardLayoutChange("horizontal")}
          className={`${buttonSize} rounded-md flex items-center justify-center transition-colors relative ${
            boardLayout === "horizontal"
              ? "text-gray-700 bg-white"
              : "text-gray-400 hover:text-gray-500"
          }`}
        >
          <svg className={`${iconSize} transition-all duration-300`} fill="currentColor" viewBox="0 0 24 24">
            {/* 左側の棒 */}
            <rect 
              x="5" 
              y="4" 
              width="5" 
              height="16" 
              rx="1" 
              fill={boardLayout === "horizontal" ? (isReversed ? "#2E6B9A" : "#009645") : "currentColor"}
              className="transition-all duration-300"
            />
            {/* 右側の棒 */}
            <rect 
              x="14" 
              y="4" 
              width="5" 
              height="16" 
              rx="1" 
              fill={boardLayout === "horizontal" ? (isReversed ? "#009645" : "#2E6B9A") : "currentColor"}
              className="transition-all duration-300"
            />
          </svg>
        </button>
      </Tooltip>

      {/* 縦並びボタン */}
      <Tooltip 
        text={boardLayout === "vertical" && isReversed ? "メモとタスクを反転" : "縦並び表示"} 
        position="bottom"
      >
        <button
          onClick={() => onBoardLayoutChange("vertical")}
          className={`${buttonSize} rounded-md flex items-center justify-center transition-colors relative ${
            boardLayout === "vertical"
              ? "text-gray-700 bg-white"
              : "text-gray-400 hover:text-gray-500"
          }`}
        >
          <svg className={`${iconSize} transition-all duration-300`} fill="currentColor" viewBox="0 0 24 24">
            {/* 上側の棒 */}
            <rect 
              x="4" 
              y="5" 
              width="16" 
              height="5" 
              rx="1" 
              fill={boardLayout === "vertical" ? (isReversed ? "#2E6B9A" : "#009645") : "currentColor"}
              className="transition-all duration-300"
            />
            {/* 下側の棒 */}
            <rect 
              x="4" 
              y="14" 
              width="16" 
              height="5" 
              rx="1" 
              fill={boardLayout === "vertical" ? (isReversed ? "#009645" : "#2E6B9A") : "currentColor"}
              className="transition-all duration-300"
            />
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}

export default BoardLayoutToggle;
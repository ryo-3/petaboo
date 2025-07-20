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
          <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
            {boardLayout === "horizontal" ? (
              // 横並びが選択されている場合は色付き
              <>
                {/* 左側の棒 - 左側に表示されているアイテムの色 */}
                <rect 
                  x="5" 
                  y="4" 
                  width="5" 
                  height="16" 
                  rx="1" 
                  fill={isReversed ? "#2E6B9A" : "#009645"} // 反転時はタスク（青）、通常時はメモ（緑）
                />
                {/* 右側の棒 - 右側に表示されているアイテムの色 */}
                <rect 
                  x="14" 
                  y="4" 
                  width="5" 
                  height="16" 
                  rx="1" 
                  fill={isReversed ? "#009645" : "#2E6B9A"} // 反転時はメモ（緑）、通常時はタスク（青）
                />
              </>
            ) : (
              // 横並びが選択されていない場合は元のグレー
              <>
                <rect x="5" y="4" width="5" height="16" rx="1" />
                <rect x="14" y="4" width="5" height="16" rx="1" />
              </>
            )}
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
          <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
            {boardLayout === "vertical" ? (
              // 縦並びが選択されている場合は色付き
              <>
                {/* 上側の棒 - 上側に表示されているアイテムの色 */}
                <rect 
                  x="4" 
                  y="5" 
                  width="16" 
                  height="5" 
                  rx="1" 
                  fill={isReversed ? "#2E6B9A" : "#009645"} // 反転時はタスク（青）、通常時はメモ（緑）
                />
                {/* 下側の棒 - 下側に表示されているアイテムの色 */}
                <rect 
                  x="4" 
                  y="14" 
                  width="16" 
                  height="5" 
                  rx="1" 
                  fill={isReversed ? "#009645" : "#2E6B9A"} // 反転時はメモ（緑）、通常時はタスク（青）
                />
              </>
            ) : (
              // 縦並びが選択されていない場合は元のグレー
              <>
                <rect x="4" y="5" width="16" height="5" rx="1" />
                <rect x="4" y="14" width="16" height="5" rx="1" />
              </>
            )}
          </svg>
        </button>
      </Tooltip>
    </div>
  );
}

export default BoardLayoutToggle;
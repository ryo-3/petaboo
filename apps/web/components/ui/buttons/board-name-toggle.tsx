"use client";

import Tooltip from "@/components/ui/base/tooltip";
import BoardIcon from "@/components/icons/board-icon";

interface BoardNameToggleProps {
  showBoardName: boolean;
  onToggle: (show: boolean) => void;
  buttonSize?: string;
  iconSize?: string;
}

function BoardNameToggle({ 
  showBoardName, 
  onToggle, 
  buttonSize = "size-7", 
  iconSize = "size-4" 
}: BoardNameToggleProps) {
  return (
    <Tooltip text={showBoardName ? "ボード名を非表示" : "ボード名を表示"} position="bottom">
      <button
        onClick={() => onToggle(!showBoardName)}
        className={`bg-gray-100 shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
          showBoardName
            ? "text-gray-700 opacity-100"
            : "text-gray-500 opacity-65 hover:opacity-85"
        }`}
      >
        <BoardIcon className={iconSize} />
      </button>
    </Tooltip>
  );
}

export default BoardNameToggle;
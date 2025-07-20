"use client";

import Tooltip from "@/components/ui/base/tooltip";
import DashboardIcon from "@/components/icons/dashboard-icon";

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
        onClick={() => {
          console.log('🔍 BoardNameToggle クリック:', { 
            current: showBoardName, 
            next: !showBoardName 
          });
          onToggle(!showBoardName);
        }}
        className={`shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
          showBoardName
            ? "bg-light-Blue text-white opacity-100"
            : "bg-gray-100 text-gray-500 opacity-65 hover:opacity-85"
        }`}
      >
        <DashboardIcon className={iconSize} />
      </button>
    </Tooltip>
  );
}

export default BoardNameToggle;
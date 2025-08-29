"use client";

import Tooltip from "@/components/ui/base/tooltip";
import TrashIcon from "@/components/icons/trash-icon";

interface DeletedTabToggleProps {
  showDeletedTab: boolean;
  onToggle: (show: boolean) => void;
  buttonSize: string;
  iconSize: string;
  count?: number;
}

function DeletedTabToggle({
  showDeletedTab,
  onToggle,
  buttonSize,
  iconSize,
  count = 0,
}: DeletedTabToggleProps) {
  return (
    <Tooltip
      text={showDeletedTab ? "削除済みタブを非表示" : "削除済みタブを表示"}
      position="bottom"
    >
      <button
        onClick={() => onToggle(!showDeletedTab)}
        className={`bg-gray-100 shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all relative ${
          showDeletedTab
            ? "text-gray-700 opacity-100"
            : "text-gray-500 opacity-65 hover:opacity-85"
        }`}
      >
        <TrashIcon className={iconSize} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
            {count}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

export default DeletedTabToggle;

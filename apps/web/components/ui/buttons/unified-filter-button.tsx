"use client";

import { useViewSettings } from "@/src/contexts/view-settings-context";
import FilterIcon from "@/components/icons/filter-icon";
import Tooltip from "@/components/ui/base/tooltip";

interface UnifiedFilterButtonProps {
  buttonSize?: string;
  iconSize?: string;
  onOpenTagFilter: () => void;
  onOpenBoardFilter: () => void;
}

export function UnifiedFilterButton({
  buttonSize = "size-7",
  iconSize = "w-4 h-4",
  onOpenTagFilter,
  onOpenBoardFilter,
}: UnifiedFilterButtonProps) {
  const { sessionState, openFilterModal } = useViewSettings();
  const count =
    sessionState.selectedTagIds.length + sessionState.selectedBoardIds.length;

  const handleClick = () => {
    // タグフィルターをデフォルトで開く（既存の動作に合わせる）
    openFilterModal("tag");
    onOpenTagFilter();
  };

  return (
    <Tooltip text="フィルター" position="bottom">
      <button
        onClick={handleClick}
        className={`${buttonSize} rounded-lg flex items-center justify-center transition-colors ${
          count > 0
            ? "bg-blue-500 text-white shadow-sm hover:bg-blue-600"
            : "bg-gray-100 text-gray-500 hover:text-gray-800 hover:bg-gray-200"
        }`}
      >
        <FilterIcon className={iconSize} />
      </button>
    </Tooltip>
  );
}

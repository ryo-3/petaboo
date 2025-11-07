"use client";

import { useViewSettings } from "@/src/contexts/view-settings-context";
import { Filter } from "lucide-react";
import Tooltip from "@/components/ui/base/tooltip";

interface UnifiedFilterButtonProps {
  buttonSize?: string;
  iconSize?: string;
}

export function UnifiedFilterButton({
  buttonSize = "size-9",
  iconSize = "size-5",
}: UnifiedFilterButtonProps) {
  const { openFilterModal, getActiveFilterCount } = useViewSettings();
  const count = getActiveFilterCount();

  return (
    <Tooltip text="フィルター" position="bottom">
      <button
        onClick={() => openFilterModal()}
        className={`${buttonSize} relative flex items-center justify-center rounded hover:bg-gray-100 transition-colors`}
        aria-label="フィルター"
      >
        <Filter className={iconSize} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-medium">
            {count}
          </span>
        )}
      </button>
    </Tooltip>
  );
}

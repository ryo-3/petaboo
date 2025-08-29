"use client";

import { useState } from "react";
import Tooltip from "@/components/ui/base/tooltip";
import DashboardIcon from "@/components/icons/dashboard-icon";
import FilterIcon from "@/components/icons/filter-icon";
import BoardSelectionModal from "@/components/ui/modals/board-selection-modal";

interface BoardNameToggleProps {
  showBoardName: boolean;
  onToggle: (show: boolean) => void;
  buttonSize?: string;
  iconSize?: string;
  boards?: Array<{ id: number; name: string }>;
  selectedBoardIds?: number[];
  onBoardFilterChange?: (boardIds: number[]) => void;
  // フィルターモード関連
  filterMode?: "include" | "exclude";
  onFilterModeChange?: (mode: "include" | "exclude") => void;
}

function BoardNameToggle({
  showBoardName,
  onToggle,
  buttonSize = "size-7",
  iconSize = "size-4",
  boards = [],
  selectedBoardIds = [],
  onBoardFilterChange,
  filterMode = "include",
  onFilterModeChange,
}: BoardNameToggleProps) {
  const [showFilterModal, setShowFilterModal] = useState(false);

  const handleSelectionChange = (boardIds: number[]) => {
    if (onBoardFilterChange) {
      onBoardFilterChange(boardIds);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip
        text={showBoardName ? "ボード名を非表示" : "ボード名を表示"}
        position="bottom"
      >
        <button
          onClick={() => {
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

      {/* フィルターボタン（ボード名表示時のみ） */}
      {showBoardName && onBoardFilterChange && (
        <>
          <Tooltip text="ボード名で絞込" position="bottom">
            <button
              onClick={() => setShowFilterModal(true)}
              className={`shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
                selectedBoardIds.length > 0
                  ? "bg-light-Blue text-white opacity-100"
                  : "bg-gray-100 text-gray-500 opacity-65 hover:opacity-85"
              }`}
            >
              <FilterIcon className={iconSize} />
            </button>
          </Tooltip>

          {/* ボード絞り込みモーダル */}
          <BoardSelectionModal
            isOpen={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            boards={boards}
            selectedBoardIds={selectedBoardIds}
            onSelectionChange={handleSelectionChange}
            mode="filter"
            multiple={true}
            filterMode={filterMode}
            onFilterModeChange={onFilterModeChange}
          />
        </>
      )}
    </div>
  );
}

export default BoardNameToggle;

"use client";

import { useState } from "react";
import TagIcon from "@/components/icons/tag-icon";
import FilterIcon from "@/components/icons/filter-icon";
import Tooltip from "@/components/ui/base/tooltip";
import TagSelectionModal from "@/components/ui/modals/tag-selection-modal";
import { TAG_COLORS } from "@/src/constants/colors";

interface TagDisplayToggleProps {
  showTags: boolean;
  onToggle: (show: boolean) => void;
  buttonSize?: string;
  iconSize?: string;
  tags?: Array<{ id: number; name: string; color?: string }>;
  selectedTagIds?: number[];
  onTagFilterChange?: (tagIds: number[]) => void;
  // フィルターモード関連
  filterMode?: "include" | "exclude";
  onFilterModeChange?: (mode: "include" | "exclude") => void;
  // ヘッダー内配置フラグ（モーダル位置調整用）
  inHeader?: boolean;
}

export default function TagDisplayToggle({
  showTags,
  onToggle,
  buttonSize = "size-7",
  iconSize = "size-4",
  tags = [],
  selectedTagIds = [],
  onTagFilterChange,
  filterMode = "include",
  onFilterModeChange,
  inHeader = false,
}: TagDisplayToggleProps) {
  const [showFilterModal, setShowFilterModal] = useState(false);

  const handleSelectionChange = (tagIds: number[]) => {
    if (onTagFilterChange) {
      onTagFilterChange(tagIds);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Tooltip
        text={showTags ? "タグを非表示" : "タグを表示"}
        position="bottom"
      >
        <button
          onClick={() => onToggle(!showTags)}
          className={`shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
            showTags ? "hover:opacity-80" : "bg-gray-100 hover:bg-gray-200"
          }`}
          style={showTags ? { backgroundColor: TAG_COLORS.background } : {}}
        >
          <TagIcon
            className={iconSize}
            style={{
              color: showTags ? TAG_COLORS.text : TAG_COLORS.iconDefault,
            }}
          />
        </button>
      </Tooltip>

      {/* フィルターボタン（タグ表示時のみ） */}
      {showTags && onTagFilterChange && (
        <>
          <Tooltip text="タグで絞込" position="bottom">
            <button
              onClick={() => setShowFilterModal(true)}
              className={`shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
                selectedTagIds.length > 0
                  ? "opacity-100"
                  : "bg-gray-100 text-gray-500 opacity-65 hover:opacity-85"
              }`}
              style={
                selectedTagIds.length > 0
                  ? { backgroundColor: TAG_COLORS.background }
                  : {}
              }
            >
              <FilterIcon
                className={iconSize}
                style={{
                  color:
                    selectedTagIds.length > 0 ? TAG_COLORS.text : undefined,
                }}
              />
            </button>
          </Tooltip>

          {/* タグ絞り込みモーダル */}
          <TagSelectionModal
            isOpen={showFilterModal}
            onClose={() => setShowFilterModal(false)}
            tags={tags}
            selectedTagIds={selectedTagIds}
            onSelectionChange={handleSelectionChange}
            mode="filter"
            multiple={true}
            filterMode={filterMode}
            onFilterModeChange={onFilterModeChange}
            topOffset={inHeader ? 64 : 0}
          />
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import FilterIcon from "@/components/icons/filter-icon";
import Tooltip from "@/components/ui/base/tooltip";
import { useBoardCategories } from "@/src/hooks/use-board-categories";
import { useTeamContext } from "@/src/contexts/team-context";

interface BoardCategoryFilterToggleProps {
  boardId: number;
  selectedCategoryIds: (number | "all" | "uncategorized")[];
  onFilterChange: (categoryIds: (number | "all" | "uncategorized")[]) => void;
  buttonSize?: string;
  iconSize?: string;
}

export default function BoardCategoryFilterToggle({
  boardId,
  selectedCategoryIds,
  onFilterChange,
  buttonSize = "size-6",
  iconSize = "size-4",
}: BoardCategoryFilterToggleProps) {
  const { teamId } = useTeamContext();
  const { categories } = useBoardCategories(boardId, teamId ?? undefined);
  const [showSelector, setShowSelector] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasActiveFilter =
    !selectedCategoryIds.includes("all") && selectedCategoryIds.length > 0;

  // フィルターオプション作成
  const filterOptions = useMemo(() => {
    const options: { value: string; label: string; color: string }[] = [
      { value: "all", label: "全て", color: "bg-gray-100" },
      { value: "uncategorized", label: "未分類", color: "bg-gray-100" },
    ];

    // カテゴリーをsortOrderでソート
    const sortedCategories = [...categories].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );

    sortedCategories.forEach((category) => {
      options.push({
        value: category.id.toString(),
        label: category.name,
        color: "bg-gray-100",
      });
    });

    return options;
  }, [categories]);

  // 現在の選択状態を表示用文字列に変換
  const getDisplayValue = () => {
    if (selectedCategoryIds.includes("all")) {
      return "all";
    }
    if (selectedCategoryIds.length === 1) {
      const singleId = selectedCategoryIds[0];
      if (singleId === "uncategorized") {
        return "uncategorized";
      }
      return singleId?.toString() || "";
    }
    return "";
  };

  // フィルター切り替え（選択中の場合は解除）
  const handleFilterChange = (selectedValue: string) => {
    if (selectedValue === "all") {
      // 全てが既に選択されている場合は解除（全て表示に戻す）
      if (selectedCategoryIds.includes("all")) {
        onFilterChange(["all"]);
      } else {
        onFilterChange(["all"]);
      }
    } else if (selectedValue === "uncategorized") {
      // 未分類が既に選択されている場合は解除
      if (selectedCategoryIds.includes("uncategorized")) {
        onFilterChange(["all"]);
      } else {
        onFilterChange(["uncategorized"]);
      }
    } else {
      const categoryId = parseInt(selectedValue);
      // 既に選択されているカテゴリーの場合は解除
      if (selectedCategoryIds.includes(categoryId)) {
        onFilterChange(["all"]);
      } else {
        onFilterChange([categoryId]);
      }
    }
  };

  // アイコンクリックでセレクターを開く/閉じる
  const handleIconClick = () => {
    if (showSelector) {
      // 閉じる時
      setShowSelector(false);
      setTimeout(() => setShowTooltip(true), 100); // ツールチップを少し遅れて表示
    } else {
      // 開く時
      setShowTooltip(false); // ツールチップを先に隠す
      setTimeout(() => setShowSelector(true), 100);
    }
  };

  // 外部クリックでセレクターを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (showSelector) {
          setShowSelector(false);
          setTimeout(() => setShowTooltip(true), 100);
        }
      }
    };

    if (showSelector) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showSelector]);

  return (
    <div className="relative" ref={containerRef}>
      {showTooltip && !showSelector ? (
        <Tooltip text="ボードカテゴリーで絞込" position="bottom">
          <button
            onClick={handleIconClick}
            className={`shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
              hasActiveFilter
                ? "bg-gray-200 text-gray-600 opacity-100"
                : "bg-gray-100 text-gray-500 opacity-65 hover:opacity-85"
            }`}
          >
            <FilterIcon className={iconSize} />
          </button>
        </Tooltip>
      ) : (
        <button
          onClick={handleIconClick}
          className={`shadow-sm rounded-lg ${buttonSize} flex items-center justify-center transition-all ${
            hasActiveFilter
              ? "bg-gray-200 text-gray-600 opacity-100"
              : "bg-gray-100 text-gray-500 opacity-65 hover:opacity-85"
          }`}
        >
          <FilterIcon className={iconSize} />
        </button>
      )}

      {showSelector && (
        <div className="absolute top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 min-w-48 animate-in fade-in duration-150">
          <div className="flex flex-col gap-1">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  handleFilterChange(option.value);
                  // セレクターは閉じない
                }}
                className={`px-2 py-1.5 text-sm text-left rounded transition-colors ${
                  (selectedCategoryIds.includes("all") &&
                    option.value === "all") ||
                  (selectedCategoryIds.includes("uncategorized") &&
                    option.value === "uncategorized") ||
                  (selectedCategoryIds.includes(parseInt(option.value)) &&
                    option.value !== "all" &&
                    option.value !== "uncategorized")
                    ? "bg-gray-200 text-gray-700"
                    : "hover:bg-gray-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

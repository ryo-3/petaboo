"use client";

import { ReactNode } from "react";
import ItemGrid from "@/components/ui/layout/item-grid";
import EmptyState from "@/components/ui/feedback/empty-state";

interface SortOption {
  id: string;
  label: string;
  enabled: boolean;
  direction: "asc" | "desc";
}

interface ItemStatusDisplayProps<T extends { id: number }> {
  items: T[] | undefined;
  viewMode: "card" | "list";
  effectiveColumnCount: number;
  selectionMode?: "select" | "check";
  checkedItems?: Set<number>;
  onToggleCheck?: (itemId: number) => void;
  onSelectItem?: (item: T) => void;
  selectedItemId?: number;
  showEditDate?: boolean;
  showBoardName?: boolean;
  showTags?: boolean;
  sortOptions?: SortOption[];
  emptyMessage?: string;
  renderItem: (
    item: T,
    props: {
      isChecked: boolean;
      onToggleCheck: () => void;
      onSelect: () => void;
      isSelected: boolean;
      showEditDate: boolean;
      showBoardName?: boolean;
      showTags?: boolean;
      variant?: "normal" | "deleted";
    },
  ) => ReactNode;
  getSortValue: (item: T, sortId: string) => number;
  getDefaultSortValue: (item: T) => number;
  variant?: "normal" | "deleted";
  isBoard?: boolean; // ボード詳細画面での使用かどうか
}

function ItemStatusDisplay<T extends { id: number }>({
  items,
  viewMode,
  effectiveColumnCount,
  selectionMode = "select",
  checkedItems,
  onToggleCheck,
  onSelectItem,
  selectedItemId,
  showEditDate = false,
  showBoardName = false,
  showTags = false,
  sortOptions = [],
  emptyMessage = "アイテムがありません",
  renderItem,
  getSortValue,
  getDefaultSortValue,
  variant = "normal",
  isBoard = false,
}: ItemStatusDisplayProps<T>) {
  const getSortedItems = () => {
    if (!items) return [];

    // 有効な並び替えオプションを取得
    const enabledSorts = sortOptions.filter((opt) => opt.enabled);

    if (enabledSorts.length === 0) {
      // デフォルトソート
      return items.sort((a, b) => {
        const aValue = getDefaultSortValue(a);
        const bValue = getDefaultSortValue(b);
        return bValue - aValue; // 降順
      });
    }

    const sorted = items.sort((a, b) => {
      // 有効な並び替えを順番に適用
      for (const sortOption of enabledSorts) {
        const aValue = getSortValue(a, sortOption.id);
        const bValue = getSortValue(b, sortOption.id);

        let diff = aValue - bValue;

        // 方向を考慮
        if (sortOption.direction === "desc") {
          diff = -diff;
        }

        // 差がある場合はその結果を返す
        if (diff !== 0) return diff;
      }

      return 0;
    });

    return sorted;
  };

  const sortedItems = getSortedItems();

  if (sortedItems.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <ItemGrid
      viewMode={viewMode}
      effectiveColumnCount={effectiveColumnCount}
      isBoard={isBoard}
    >
      {sortedItems
        .filter((item) => item && item.id !== undefined)
        .map((item, index) => (
          <div
            key={
              item.id !== undefined ? `item-${item.id}` : `item-index-${index}`
            }
          >
            {renderItem(item, {
              isChecked: checkedItems?.has(item.id) || false,
              onToggleCheck: () => onToggleCheck?.(item.id),
              onSelect: () => {
                if (selectionMode === "check") {
                  onToggleCheck?.(item.id);
                } else {
                  onSelectItem?.(item);
                }
              },
              isSelected: selectedItemId === item.id,
              showEditDate,
              showBoardName,
              showTags,
              variant,
            })}
          </div>
        ))}
    </ItemGrid>
  );
}

export default ItemStatusDisplay;

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
  effectiveColumnCount: number;
  selectionMode?: "select" | "check";
  checkedItems?: Set<number>;
  onToggleCheck?: (itemId: number) => void;
  onSelectItem?: (item: T) => void;
  selectedItemId?: number;
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
      showBoardName?: boolean;
      showTags?: boolean;
      variant?: "normal" | "deleted";
    },
  ) => ReactNode;
  getSortValue: (item: T, sortId: string) => number;
  getDefaultSortValue: (item: T) => number;
  variant?: "normal" | "deleted";
  isBoard?: boolean; // ボード詳細画面での使用かどうか
  itemType?: "task" | "memo"; // アイテムタイプ（DOM属性用）
  // 全選択機能
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

function ItemStatusDisplay<T extends { id: number }>({
  items,
  effectiveColumnCount,
  selectionMode = "select",
  checkedItems,
  onToggleCheck,
  onSelectItem,
  selectedItemId,
  showBoardName = true,
  showTags = true,
  sortOptions = [],
  emptyMessage = "アイテムがありません",
  renderItem,
  getSortValue,
  getDefaultSortValue,
  variant = "normal",
  isBoard = false,
  itemType,
  onSelectAll,
  isAllSelected,
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
    <ItemGrid effectiveColumnCount={effectiveColumnCount} isBoard={isBoard}>
      {sortedItems
        .filter((item) => item && item.id !== undefined)
        .map((item, index) => {
          // DOM順序取得のためのdata属性を動的に決定
          const dataAttributes: { [key: string]: string } = {};
          if (itemType === "task") {
            dataAttributes["data-task-id"] = item.id.toString();
          } else if (itemType === "memo") {
            dataAttributes["data-memo-id"] = item.id.toString();
          }

          return (
            <div
              key={
                item.id !== undefined
                  ? `item-${item.id}`
                  : `item-index-${index}`
              }
              {...dataAttributes}
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
                showBoardName,
                showTags,
                variant,
              })}
            </div>
          );
        })}

      {/* 下部余白用の透明カード（モバイルのみ・ナビゲーションバー分） */}
      {!isBoard && (
        <div
          className="md:hidden min-h-[150px] opacity-0 pointer-events-none"
          key="spacer-bottom"
          aria-hidden="true"
        />
      )}
    </ItemGrid>
  );
}

export default ItemStatusDisplay;

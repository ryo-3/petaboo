import { useCallback, useMemo } from "react";

interface UseBoardSelectAllConfig<T> {
  items: T[];
  checkedItems: Set<string | number>;
  setCheckedItems: (items: Set<string | number>) => void;
  getItemId: (item: T) => string | number;
}

/**
 * ボード用の全選択/全解除機能を管理するカスタムフック
 * string | number型のIDに対応
 */
export function useBoardSelectAll<T>({
  items,
  checkedItems,
  setCheckedItems,
  getItemId,
}: UseBoardSelectAllConfig<T>) {
  // 全選択状態の判定
  const isAllSelected = useMemo(() => {
    if (items.length === 0) return false;
    const currentItemIds = items.map(getItemId);
    return currentItemIds.every((id) => checkedItems.has(id));
  }, [items, checkedItems, getItemId]);

  // 全選択/全解除処理
  const handleSelectAll = useCallback(() => {
    const currentItemIds = items.map(getItemId);
    console.log("🔍 全選択ボタンクリック:", {
      itemsLength: items.length,
      currentItemIds,
      isAllSelected,
      checkedItems: Array.from(checkedItems),
    });
    if (isAllSelected) {
      setCheckedItems(new Set());
    } else {
      setCheckedItems(new Set(currentItemIds));
    }
  }, [items, isAllSelected, setCheckedItems, getItemId]);

  return { isAllSelected, handleSelectAll };
}

import { useCallback, useMemo } from 'react';

interface UseSelectAllConfig<T extends { id: number }, D extends { id: number }> {
  activeTab: string;
  deletedTabName?: string; // "deleted"
  items: T[] | null;
  deletedItems: D[] | null;
  checkedItems: Set<number>;
  checkedDeletedItems: Set<number>;
  setCheckedItems: (items: Set<number>) => void;
  setCheckedDeletedItems: (items: Set<number>) => void;
  filterFn?: (item: T, activeTab: string) => boolean; // タスクのステータスフィルタ用
}

/**
 * 全選択/全解除機能を管理するカスタムフック
 * メモ・タスクの両方で共通使用
 */
export function useSelectAll<T extends { id: number }, D extends { id: number }>({
  activeTab,
  deletedTabName = "deleted",
  items,
  deletedItems,
  checkedItems,
  checkedDeletedItems,
  setCheckedItems,
  setCheckedDeletedItems,
  filterFn,
}: UseSelectAllConfig<T, D>) {
  
  // 全選択状態の判定
  const isAllSelected = useMemo(() => {
    if (activeTab === deletedTabName && deletedItems && deletedItems.length > 0) {
      return deletedItems.every(item => checkedDeletedItems.has(item.id));
    } else if (items) {
      const filteredItems = filterFn 
        ? items.filter(item => filterFn(item, activeTab))
        : items;
      
      if (filteredItems.length > 0) {
        return filteredItems.every(item => checkedItems.has(item.id));
      }
    }
    return false;
  }, [activeTab, deletedTabName, items, deletedItems, checkedItems, checkedDeletedItems, filterFn]);

  // 全選択/全解除処理
  const handleSelectAll = useCallback(() => {
    if (activeTab === deletedTabName && deletedItems) {
      if (isAllSelected) {
        setCheckedDeletedItems(new Set());
      } else {
        const allDeletedItemIds = new Set(deletedItems.map(item => item.id));
        setCheckedDeletedItems(allDeletedItemIds);
      }
    } else if (items) {
      const filteredItems = filterFn 
        ? items.filter(item => filterFn(item, activeTab))
        : items;
        
      if (isAllSelected) {
        setCheckedItems(new Set());
      } else {
        const allItemIds = new Set(filteredItems.map(item => item.id));
        setCheckedItems(allItemIds);
      }
    }
  }, [
    activeTab,
    deletedTabName,
    items,
    deletedItems,
    isAllSelected,
    checkedItems,
    checkedDeletedItems,
    setCheckedItems,
    setCheckedDeletedItems,
    filterFn
  ]);

  return { isAllSelected, handleSelectAll };
}
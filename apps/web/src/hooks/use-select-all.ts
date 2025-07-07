import { useCallback, useMemo } from 'react';
import { getTaskDisplayOrder, getMemoDisplayOrder } from '@/src/utils/domUtils';

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
  currentMode?: "memo" | "task"; // DOM順序取得用
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
  currentMode,
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
        // DOM順序で選択するように修正
        if (currentMode === "task") {
          // タスクの場合：DOM順序を取得してフィルタ
          const domOrder = getTaskDisplayOrder();
          const filteredItemIds = domOrder.filter(id => 
            filteredItems.some(item => item.id === id)
          );
          setCheckedItems(new Set(filteredItemIds));
          console.log('📋 タスク全選択 DOM順序:', { domOrder: filteredItemIds });
        } else if (currentMode === "memo") {
          // メモの場合：DOM順序を取得してフィルタ
          const domOrder = getMemoDisplayOrder();
          const filteredItemIds = domOrder.filter(id => 
            filteredItems.some(item => item.id === id)
          );
          setCheckedItems(new Set(filteredItemIds));
          console.log('📋 メモ全選択 DOM順序:', { domOrder: filteredItemIds });
        } else {
          // フォールバック：従来の方法
          const allItemIds = new Set(filteredItems.map(item => item.id));
          setCheckedItems(allItemIds);
          console.log('📋 全選択 データ順序（フォールバック）:', { dataOrder: Array.from(allItemIds) });
        }
      }
    }
  }, [
    activeTab,
    deletedTabName,
    items,
    deletedItems,
    isAllSelected,
    setCheckedItems,
    setCheckedDeletedItems,
    filterFn,
    currentMode
  ]);

  return { isAllSelected, handleSelectAll };
}
import React, { useCallback, useMemo } from 'react';
import { getTaskDisplayOrder, getMemoDisplayOrder } from '@/src/utils/domUtils';

interface UseSelectAllConfig<T extends { id: number }, D extends { id: number }> {
  activeTab: string;
  deletedTabName?: string; // "deleted"
  items: T[] | null;
  deletedItems: D[] | null;
  checkedItems: Set<number>;
  checkedDeletedItems: Set<number>;
  setCheckedItems: React.Dispatch<React.SetStateAction<Set<number>>>;
  setCheckedDeletedItems: React.Dispatch<React.SetStateAction<Set<number>>>;
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
      // 削除済みタブの操作時
      if (isAllSelected) {
        setCheckedDeletedItems(new Set());
      } else {
        const allDeletedItemIds = new Set(deletedItems.map(item => item.id));
        setCheckedDeletedItems(allDeletedItemIds);
      }
    } else if (items) {
      // 通常タブの操作時
      const filteredItems = filterFn 
        ? items.filter(item => filterFn(item, activeTab))
        : items;
        
      if (isAllSelected) {
        // 現在のタブのアイテムのみを選択から除外
        const currentTabItemIds = filteredItems.map(item => item.id);
        
        setCheckedItems(prev => {
          const newSet = new Set(prev);
          currentTabItemIds.forEach(id => newSet.delete(id));
          return newSet;
        });
      } else {
        // DOM順序で選択するように修正
        if (currentMode === "task") {
          // タスクの場合：DOM順序を取得してフィルタ
          const domOrder = getTaskDisplayOrder();
          const filteredItemIds = domOrder.filter(id => 
            filteredItems.some(item => item.id === id)
          );
          // 既存の選択状態を保持して追加
          setCheckedItems(prev => {
            const newSet = new Set(prev);
            filteredItemIds.forEach(id => newSet.add(id));
            return newSet;
          });
          // console.log('📋 タスク全選択 DOM順序:', { domOrder: filteredItemIds });
        } else if (currentMode === "memo") {
          // メモの場合：DOM順序を取得してフィルタ
          const domOrder = getMemoDisplayOrder();
          const filteredItemIds = domOrder.filter(id => 
            filteredItems.some(item => item.id === id)
          );
          // 既存の選択状態を保持して追加
          setCheckedItems(prev => {
            const newSet = new Set(prev);
            filteredItemIds.forEach(id => newSet.add(id));
            return newSet;
          });
          // console.log('📋 メモ全選択 DOM順序:', { domOrder: filteredItemIds });
        } else {
          // フォールバック：従来の方法
          const allItemIds = filteredItems.map(item => item.id);
          // 既存の選択状態を保持して追加
          setCheckedItems(prev => {
            const newSet = new Set(prev);
            allItemIds.forEach(id => newSet.add(id));
            return newSet;
          });
          // console.log('📋 全選択 データ順序（フォールバック）:', { dataOrder: allItemIds });
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
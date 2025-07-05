import { useCallback } from 'react';
import { getNextDeletedItem } from '@/src/utils/domUtils';

interface UseNextDeletedItemSelectionConfig<T extends { id: number; deletedAt: number }> {
  deletedItems: T[] | undefined | null;
  onSelectDeletedItem: (item: T | null, fromFullList?: boolean) => void;
  onClose: () => void;
  setScreenMode: (mode: string) => void;
  editorSelector: string; // '[data-memo-editor]' or '[data-task-editor]'
}

/**
 * 削除後の次選択処理を管理するカスタムフック
 * メモ・タスクの両方で共通使用
 */
export function useNextDeletedItemSelection<T extends { id: number; deletedAt: number }>({
  deletedItems,
  onSelectDeletedItem,
  onClose,
  setScreenMode,
  editorSelector,
}: UseNextDeletedItemSelectionConfig<T>) {
  
  return useCallback((deletedItem: T) => {
    if (!deletedItems) {
      onClose();
      return;
    }

    const nextItem = getNextDeletedItem(deletedItems, deletedItem);

    if (nextItem && nextItem.id !== deletedItem.id) {
      // 次のアイテムを選択
      onSelectDeletedItem(nextItem as T, true);
      setScreenMode("view");

      // エディター表示復元
      setTimeout(() => {
        const editor = document.querySelector(editorSelector) as HTMLElement;
        if (editor) {
          editor.style.visibility = "visible";
          editor.style.pointerEvents = "auto";
        }
      }, 100);
    } else {
      // 次がない場合はリストに戻る
      setScreenMode("list");
      onClose();
    }
  }, [deletedItems, onSelectDeletedItem, onClose, setScreenMode, editorSelector]);
}
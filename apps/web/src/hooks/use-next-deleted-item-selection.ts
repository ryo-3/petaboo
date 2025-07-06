import { useCallback } from 'react';
import { getNextDeletedItem } from '@/src/utils/domUtils';

interface UseNextDeletedItemSelectionConfig<T extends { id: number; deletedAt: number }> {
  deletedItems: T[] | undefined | null;
  onSelectDeletedItem: (item: T | null, fromFullList?: boolean) => void;
  onDeselectOnly?: () => void; // 選択解除のみ（画面遷移なし）
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
  onDeselectOnly,
  setScreenMode,
  editorSelector,
}: UseNextDeletedItemSelectionConfig<T>) {
  
  return useCallback((deletedItem: T) => {
    if (!deletedItems) {
      if (onDeselectOnly) {
        onDeselectOnly();
      } else {
        onSelectDeletedItem(null);
      }
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
      // 次がない場合は選択を解除（エディターを閉じる）
      if (onDeselectOnly) {
        onDeselectOnly();
      } else {
        onSelectDeletedItem(null);
      }
    }
  }, [deletedItems, onSelectDeletedItem, onDeselectOnly, setScreenMode, editorSelector]);
}
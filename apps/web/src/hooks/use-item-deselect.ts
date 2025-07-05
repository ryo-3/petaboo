import { useCallback } from 'react';

/**
 * アイテムの選択解除処理を管理するカスタムフック
 * メモ・タスクの両方で共通使用
 */
export function useItemDeselect(
  selectedItem: any,
  selectedDeletedItem: any,
  onClearSelection: () => void,
  setScreenMode: (mode: string) => void
) {
  return useCallback((id: number) => {
    if (selectedItem?.id === id || selectedDeletedItem?.id === id) {
      onClearSelection();
      setScreenMode("list");
    }
  }, [selectedItem, selectedDeletedItem, onClearSelection, setScreenMode]);
}
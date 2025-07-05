import { useCallback } from 'react';

interface UseTabChangeConfig {
  setActiveTab: (tab: string) => void;
  setScreenMode: (mode: string) => void;
  onClearSelection: () => void;
  // 個別選択クリア（メモ用のオプション）
  selectedItem?: any;
  selectedDeletedItem?: any;
  onSelectItem?: (item: any) => void;
  onSelectDeletedItem?: (item: any) => void;
  normalTabName?: string; // "normal" or "todo"
  deletedTabName?: string; // "deleted"
}

/**
 * タブ切り替え時の選択状態クリア処理を管理するカスタムフック
 * メモ・タスクの両方で共通使用
 */
export function useTabChange({
  setActiveTab,
  setScreenMode,
  onClearSelection,
  selectedItem,
  selectedDeletedItem,
  onSelectItem,
  onSelectDeletedItem,
  normalTabName = "normal",
  deletedTabName = "deleted"
}: UseTabChangeConfig) {
  
  return useCallback((tab: string) => {
    // 個別選択のクリア（メモ形式）
    if (onSelectItem && onSelectDeletedItem) {
      if (tab === normalTabName && selectedDeletedItem) {
        onSelectDeletedItem(null);
        setScreenMode("list");
      } else if (tab === deletedTabName && selectedItem) {
        onSelectItem(null);
        setScreenMode("list");
      }
    } else {
      // 共通クリア処理（タスク形式）
      setScreenMode("list");
      onClearSelection();
    }

    setActiveTab(tab);
  }, [
    setActiveTab,
    setScreenMode,
    onClearSelection,
    selectedItem,
    selectedDeletedItem,
    onSelectItem,
    onSelectDeletedItem,
    normalTabName,
    deletedTabName
  ]);
}
import { useCallback } from 'react';

interface UseTabChangeConfig {
  setActiveTab: (tab: string) => void;
  setScreenMode: (mode: string) => void;
  // 個別選択クリア（メモ用のオプション）
  selectedItem?: { id: number } | null;
  selectedDeletedItem?: { id: number } | null;
  onSelectItem?: (item: { id: number } | null) => void;
  onSelectDeletedItem?: (item: { id: number } | null) => void;
  normalTabName?: string; // "normal" or "todo"
  deletedTabName?: string; // "deleted"
}

/**
 * タブ切り替え時の選択状態クリア処理を管理するカスタムフック
 * メモ・タスクの両方で共通使用
 * 注意：チェックボックス選択は保持される（元の仕様通り）
 */
export function useTabChange({
  setActiveTab,
  setScreenMode,
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
      // タスク形式：右パネルを閉じるのみ
      setScreenMode("list");
    }

    setActiveTab(tab);
  }, [
    setActiveTab,
    setScreenMode,
    selectedItem,
    selectedDeletedItem,
    onSelectItem,
    onSelectDeletedItem,
    normalTabName,
    deletedTabName
  ]);
}
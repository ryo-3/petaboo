import { useCallback } from 'react';

interface UseSelectionHandlersConfig<T, D> {
  setScreenMode: (mode: string) => void;
  onSelectItem: (item: T | null, fromFullList?: boolean) => void;
  onSelectDeletedItem: (item: D | null, fromFullList?: boolean) => void;
  onClearSelection?: () => void;
  onDeselectAndStay?: () => void;
}

/**
 * 選択ハンドラーパターンを共通化するカスタムフック
 * memo・task両方で使用可能
 */
export function useSelectionHandlers<T, D = T>({
  setScreenMode,
  onSelectItem,
  onSelectDeletedItem,
  onClearSelection,
  onDeselectAndStay,
}: UseSelectionHandlersConfig<T, D>) {
  
  // 通常アイテムの選択ハンドラー
  const handleSelectItem = useCallback((item: T) => {
    onSelectItem(item, true);
    setScreenMode('view');
  }, [onSelectItem, setScreenMode]);

  // 削除済みアイテムの選択ハンドラー
  const handleSelectDeletedItem = useCallback((item: D) => {
    onSelectDeletedItem(item, true);
    setScreenMode('view');
  }, [onSelectDeletedItem, setScreenMode]);

  // 新規作成ハンドラー
  const handleCreateNew = useCallback(() => {
    onSelectItem(null, true);
    onSelectDeletedItem(null, true);
    setScreenMode('create');
  }, [onSelectItem, onSelectDeletedItem, setScreenMode]);

  // 右パネルクローズハンドラー
  const handleRightPanelClose = useCallback(() => {
    setScreenMode('list');
    if (onClearSelection) {
      onClearSelection();
    } else if (onDeselectAndStay) {
      onDeselectAndStay();
    }
  }, [setScreenMode, onClearSelection, onDeselectAndStay]);

  // タブ変更時のハンドラー
  const handleTabChange = useCallback((handler: (tab: string) => void) => (tab: string) => {
    handler(tab);
    if (onClearSelection) {
      onClearSelection();
    } else if (onDeselectAndStay) {
      onDeselectAndStay();
    }
  }, [onClearSelection, onDeselectAndStay]);

  return {
    handleSelectItem,
    handleSelectDeletedItem,
    handleCreateNew,
    handleRightPanelClose,
    handleTabChange,
  };
}
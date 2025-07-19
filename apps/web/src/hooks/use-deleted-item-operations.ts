import { useCallback } from "react";
import { useNextDeletedItemSelection } from "@/src/hooks/use-next-deleted-item-selection";
import { createDeletedNextSelectionHandler } from "@/src/utils/domUtils";

/**
 * 削除済みアイテムの共通操作ロジック
 * シンプルな処理の重複削除のみ
 */
export function useDeletedItemOperations<T extends { id: number; deletedAt: number }>({
  deletedItems,
  onSelectDeletedItem,
  setScreenMode,
  editorSelector,
  restoreOptions = {}
}: {
  deletedItems: T[] | null;
  onSelectDeletedItem: (item: T | null) => void;
  setScreenMode: (mode: string) => void;
  editorSelector: string;
  restoreOptions?: Record<string, unknown>;
}) {
  
  // 削除後の次選択処理
  const selectNextDeletedItem = useNextDeletedItemSelection({
    deletedItems,
    onSelectDeletedItem,
    onDeselectOnly: () => onSelectDeletedItem(null),
    setScreenMode,
    editorSelector,
  });

  // 復元時の次選択処理 - 単純なラッパー
  const handleRestoreAndSelectNext = useCallback((deletedItem: T) => {
    if (!deletedItems) return;
    
    createDeletedNextSelectionHandler(
      deletedItems,
      deletedItem,
      onSelectDeletedItem,
      () => onSelectDeletedItem(null),
      setScreenMode,
      restoreOptions
    );
  }, [deletedItems, onSelectDeletedItem, setScreenMode, restoreOptions]);

  return {
    selectNextDeletedItem,
    handleRestoreAndSelectNext,
  };
}
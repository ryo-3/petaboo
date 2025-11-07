import { useCallback } from "react";
import { useNextDeletedItemSelection } from "@/src/hooks/use-next-deleted-item-selection";
import { getNextDeletedItem } from "@/src/utils/domUtils";

/**
 * 削除済みアイテムの共通操作ロジック
 * シンプルな処理の重複削除のみ
 */
export function useDeletedItemOperations<
  T extends { id: number; deletedAt: number },
>({
  deletedItems,
  onSelectDeletedItem,
  setScreenMode,
  editorSelector,
  restoreOptions = {},
}: {
  deletedItems: T[] | null;
  onSelectDeletedItem: (item: T | null, fromFullList?: boolean) => void;
  setScreenMode: (mode: string) => void;
  editorSelector: string;
  restoreOptions?: {
    isRestore?: boolean;
    onSelectWithFromFlag?: boolean;
  };
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
  const handleRestoreAndSelectNext = useCallback(
    (deletedItem: T) => {
      if (!deletedItems) {
        return;
      }

      const nextItem = getNextDeletedItem(deletedItems, deletedItem);

      if (nextItem) {
        if (restoreOptions?.isRestore && restoreOptions?.onSelectWithFromFlag) {
          onSelectDeletedItem(nextItem, true);
        } else {
          onSelectDeletedItem(nextItem);
        }
        setScreenMode("view");
      } else {
        onSelectDeletedItem(null);
      }
    },
    [deletedItems, onSelectDeletedItem, restoreOptions, setScreenMode],
  );

  return {
    selectNextDeletedItem,
    handleRestoreAndSelectNext,
  };
}

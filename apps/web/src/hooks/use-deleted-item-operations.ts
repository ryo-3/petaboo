import { useCallback } from "react";
import { useNextDeletedItemSelection } from "@/src/hooks/use-next-deleted-item-selection";
import { createDeletedNextSelectionHandler } from "@/src/utils/domUtils";

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
  const handleRestoreAndSelectNext = useCallback(
    (deletedItem: T) => {
      console.log(
        "🔄 useDeletedItemOperations.handleRestoreAndSelectNext 開始",
        {
          deletedItemId: deletedItem?.id,
          totalDeletedItems: deletedItems?.length || 0,
          deletedItems:
            deletedItems?.map((item, index) => ({
              index,
              id: item.id,
              deletedAt: item.deletedAt,
            })) || [],
        },
      );

      console.log(
        "⚠️ 重要: この共通フックは次選択ロジックのみで、実際の復元APIは含まれていません",
      );
      console.log(
        "📞 実際の復元APIは別のフック（useDeletedMemoActions）で実行する必要があります",
      );

      if (!deletedItems) {
        console.log("❌ deletedItems が null のため復元処理スキップ");
        return;
      }

      createDeletedNextSelectionHandler(
        deletedItems,
        deletedItem,
        onSelectDeletedItem,
        () => onSelectDeletedItem(null),
        setScreenMode,
        restoreOptions,
      );
    },
    [deletedItems, onSelectDeletedItem, setScreenMode, restoreOptions],
  );

  return {
    selectNextDeletedItem,
    handleRestoreAndSelectNext,
  };
}

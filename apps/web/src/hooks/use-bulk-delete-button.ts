import { useMemo } from "react";
import {
  shouldShowDeleteButton,
  getDeleteButtonCount,
} from "@/src/utils/screenUtils";
import { useDelayedButtonVisibility } from "./use-delayed-button-visibility";

interface UseBulkDeleteButtonConfig {
  activeTab: string;
  deletedTabName: string;
  checkedItems: Set<number>;
  checkedDeletedItems: Set<number>;
  isDeleting: boolean;
  isRestoring?: boolean;
}

/**
 * 一括削除ボタンの表示制御を管理するカスタムフック
 * メモ・タスクの両方で共通使用
 */
export function useBulkDeleteButton({
  activeTab,
  deletedTabName,
  checkedItems,
  checkedDeletedItems,
  isDeleting,
  isRestoring = false,
}: UseBulkDeleteButtonConfig) {
  // 削除ボタン表示判定の統一化
  const shouldShowLeftBulkDelete = useMemo(() => {
    // 復元中は削除ボタンを非表示
    if (isRestoring) {
      return false;
    }
    // 削除中は強制的に表示を維持
    if (isDeleting) {
      return true;
    }
    return shouldShowDeleteButton(
      activeTab,
      deletedTabName,
      checkedItems,
      checkedDeletedItems,
    );
  }, [
    activeTab,
    deletedTabName,
    checkedItems,
    checkedDeletedItems,
    isDeleting,
    isRestoring,
  ]);

  const deleteButtonCount = useMemo(() => {
    return getDeleteButtonCount(
      activeTab,
      deletedTabName,
      checkedItems,
      checkedDeletedItems,
    );
  }, [activeTab, deletedTabName, checkedItems, checkedDeletedItems]);

  // 削除ボタンの遅延非表示処理（復元中は即座に非表示）
  const showDeleteButton = useDelayedButtonVisibility(
    shouldShowLeftBulkDelete,
    isDeleting || isRestoring, // 復元中も即座に反応するように
    isRestoring ? 0 : 1500, // 復元中は遅延なし、削除中は1.5秒
  );

  return {
    showDeleteButton,
    deleteButtonCount,
  };
}

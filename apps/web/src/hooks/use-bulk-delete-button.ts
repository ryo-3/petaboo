import { useMemo } from 'react';
import { shouldShowDeleteButton, getDeleteButtonCount } from '@/src/utils/screenUtils';
import { useDelayedButtonVisibility } from './use-delayed-button-visibility';

interface UseBulkDeleteButtonConfig {
  activeTab: string;
  deletedTabName: string;
  checkedItems: Set<number>;
  checkedDeletedItems: Set<number>;
  isDeleting: boolean;
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
}: UseBulkDeleteButtonConfig) {
  
  // 削除ボタン表示判定の統一化
  const shouldShowLeftBulkDelete = useMemo(() => {
    // 削除中は強制的に表示を維持
    if (isDeleting) {
      return true;
    }
    return shouldShowDeleteButton(
      activeTab,
      deletedTabName,
      checkedItems,
      checkedDeletedItems
    );
  }, [activeTab, deletedTabName, checkedItems, checkedDeletedItems, isDeleting]);

  const deleteButtonCount = useMemo(() => {
    return getDeleteButtonCount(
      activeTab,
      deletedTabName,
      checkedItems,
      checkedDeletedItems
    );
  }, [activeTab, deletedTabName, checkedItems, checkedDeletedItems]);

  // 削除ボタンの遅延非表示処理
  const showDeleteButton = useDelayedButtonVisibility(
    shouldShowLeftBulkDelete,
    isDeleting,
    2500  // 2.5秒に変更
  );

  return {
    showDeleteButton,
    deleteButtonCount,
  };
}
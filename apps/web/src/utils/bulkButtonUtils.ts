/**
 * 削除ボタンの表示制御ロジック（メモ・タスク共通）
 */
export function getDeleteButtonVisibility(params: {
  activeTab: string;
  deletedTabName: string;
  checkedItems: Set<number>;
  checkedDeletedItems: Set<number>;
  isRestoreModalOpen: boolean;
  isRestoreLidOpen: boolean;
  isRestoring: boolean;
  showDeleteButton: boolean;
}) {
  const {
    activeTab,
    deletedTabName,
    checkedDeletedItems,
    isRestoreModalOpen,
    isRestoreLidOpen,
    isRestoring,
    showDeleteButton,
  } = params;

  // 削除済みタブでの特別ロジック
  if (activeTab === deletedTabName) {
    // 復元モーダル開いてる時は非表示
    if (isRestoreModalOpen) return false;
    // アニメーション中（蓋が開いている間）は非表示
    if (isRestoreLidOpen) return false;
    // 復元中で蓋が閉じていて選択項目がある場合は表示（部分復元完了後）
    if (isRestoring && !isRestoreLidOpen && checkedDeletedItems.size > 0)
      return true;
    // 復元中で蓋が閉じていて選択項目がない場合は非表示
    if (isRestoring) return false;
    // 選択項目がある時は表示
    return checkedDeletedItems.size > 0;
  }

  // 通常タブの場合
  return showDeleteButton && !isRestoreModalOpen;
}

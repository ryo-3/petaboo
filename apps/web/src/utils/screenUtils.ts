/**
 * 条件付き削除ボタン表示判定の共通ユーティリティ
 */
export function shouldShowDeleteButton(
  activeTab: string,
  deletedTabName: string,
  checkedItems: Set<number>,
  checkedDeletedItems: Set<number>
): boolean {
  return (
    (activeTab !== deletedTabName && checkedItems.size > 0) ||
    (activeTab === deletedTabName && checkedDeletedItems.size > 0)
  )
}

/**
 * 削除ボタンのカウント取得
 */
export function getDeleteButtonCount(
  activeTab: string,
  deletedTabName: string,
  checkedItems: Set<number>,
  checkedDeletedItems: Set<number>
): number {
  return activeTab === deletedTabName 
    ? checkedDeletedItems.size 
    : checkedItems.size
}
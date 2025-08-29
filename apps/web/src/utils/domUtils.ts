// シンプルなDOM取得（キャッシュなし）
// 理由: DOM取得は十分高速（<0.5ms）でキャッシュの複雑さに見合わない

/**
 * DOM上のdata-task-id属性から実際の表示順序を取得する
 */
export function getTaskDisplayOrder(): number[] {
  const taskListElements = document.querySelectorAll("[data-task-id]");
  const displayOrder: number[] = [];

  taskListElements.forEach((element) => {
    const taskId = element.getAttribute("data-task-id");
    if (taskId) {
      displayOrder.push(parseInt(taskId, 10));
    }
  });

  return displayOrder;
}

/**
 * DOM上のdata-memo-id属性から実際の表示順序を取得する
 */
export function getMemoDisplayOrder(): number[] {
  const memoListElements = document.querySelectorAll("[data-memo-id]");
  const displayOrder: number[] = [];

  memoListElements.forEach((element) => {
    const memoId = element.getAttribute("data-memo-id");
    if (memoId) {
      displayOrder.push(parseInt(memoId, 10));
    }
  });

  return displayOrder;
}

/**
 * 配列を実際のDOM表示順序でソートする
 */
export function sortByDisplayOrder<T extends { id: number }>(
  items: T[],
  displayOrder: number[],
): T[] {
  return items.sort((a, b) => {
    const aIndex = displayOrder.indexOf(a.id);
    const bIndex = displayOrder.indexOf(b.id);
    // 見つからない場合は最後に配置
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

/**
 * 削除されたアイテムの次のアイテムを選択する汎用関数
 */
export function getNextItemAfterDeletion<T extends { id: number }>(
  items: T[],
  deletedItem: T,
  displayOrder: number[],
): T | null {
  const sortedItems = sortByDisplayOrder(items, displayOrder);
  const deletedIndex = sortedItems.findIndex(
    (item) => item.id === deletedItem.id,
  );

  if (deletedIndex === -1) return null;

  // 削除されたアイテムの次のアイテムを選択
  if (deletedIndex < sortedItems.length - 1) {
    return sortedItems[deletedIndex + 1] || null;
  }
  // 最後のアイテムが削除された場合は前のアイテムを選択
  else if (deletedIndex > 0) {
    return sortedItems[deletedIndex - 1] || null;
  }

  return null;
}

/**
 * 削除済みアイテムの次選択（削除日時順）
 */
export function getNextDeletedItem<T extends { id: number; deletedAt: number }>(
  deletedItems: T[],
  deletedItem: T,
): T | null {
  const sortedItems = [...deletedItems].sort(
    (a, b) => b.deletedAt - a.deletedAt,
  );
  const deletedIndex = sortedItems.findIndex(
    (item) => item.id === deletedItem.id,
  );

  if (deletedIndex === -1) return null;

  // 削除されたアイテムの次のアイテムを選択
  if (deletedIndex < sortedItems.length - 1) {
    return sortedItems[deletedIndex + 1] || null;
  }
  // 最後のアイテムが削除された場合は前のアイテムを選択
  else if (deletedIndex > 0) {
    return sortedItems[deletedIndex - 1] || null;
  }

  return null;
}

/**
 * アイテム削除後の次選択とビューモード制御のハンドラー生成
 */
export function createNextSelectionHandler<T extends { id: number }>(
  items: T[],
  deletedItem: T,
  displayOrder: number[],
  onSelect: (item: T) => void,
  onClose: () => void,
  setViewMode: (mode: "view" | "list") => void,
) {
  const nextItem = getNextItemAfterDeletion(items, deletedItem, displayOrder);

  if (nextItem) {
    onSelect(nextItem);
    setViewMode("view");
  } else {
    setViewMode("list");
    onClose();
  }
}

/**
 * 削除済みアイテム削除後の次選択ハンドラー生成
 * 復元処理にも対応
 */
export function createDeletedNextSelectionHandler<
  T extends { id: number; deletedAt: number },
>(
  deletedItems: T[],
  deletedItem: T,
  onSelect: (item: T | null, fromFullList?: boolean) => void,
  onClose: () => void,
  setViewMode: (mode: "view" | "list") => void,
  options?: {
    isRestore?: boolean; // 復元処理かどうか
    onSelectWithFromFlag?: boolean; // onSelectにfromFullList=trueを渡すか
  },
) {
  const nextItem = getNextDeletedItem(deletedItems, deletedItem);

  if (nextItem) {
    // 復元処理の場合はfromFullList=trueを渡す
    if (options?.isRestore && options?.onSelectWithFromFlag) {
      onSelect(nextItem, true);
    } else {
      onSelect(nextItem);
    }
    setViewMode("view");
  } else {
    // 削除済みアイテムがなくなった場合は選択を解除（画面は削除済みリストのまま）
    onSelect(null);
  }
}

/**
 * 新規作成時の自動選択ハンドラー生成（DOMベース + Stateフォールバック）
 */
export function createNewItemSelectionHandler<T extends { id: number }>(
  newItem: T,
  onSelect: (item: T) => void,
  setViewMode: (mode: "view" | "list") => void,
  delay: number = 100,
) {
  // 少し遅延してからviewモードに切り替え（DOM反映を待つ）
  setTimeout(() => {
    onSelect(newItem);
    setViewMode("view");
  }, delay);
}

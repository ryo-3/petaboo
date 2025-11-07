// シンプルなDOM取得（キャッシュなし）
// 理由: DOM取得は十分高速（<0.5ms）でキャッシュの複雑さに見合わない

/**
 * DOM上のdata-task-id属性から実際の表示順序を取得する（重複除去あり）
 */
export function getTaskDisplayOrder(): number[] {
  const taskListElements = document.querySelectorAll("[data-task-id]");
  const displayOrder: number[] = [];
  const seenIds = new Set<number>();

  taskListElements.forEach((element) => {
    const taskId = element.getAttribute("data-task-id");

    if (taskId) {
      const id = parseInt(taskId, 10);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        displayOrder.push(id);
      }
    }
  });

  return displayOrder;
}

/**
 * DOM上のdata-memo-id属性から実際の表示順序を取得する（重複除去あり）
 */
export function getMemoDisplayOrder(): number[] {
  const memoListElements = document.querySelectorAll("[data-memo-id]");
  const displayOrder: number[] = [];
  const seenIds = new Set<number>();

  memoListElements.forEach((element) => {
    const memoId = element.getAttribute("data-memo-id");
    if (memoId) {
      const id = parseInt(memoId, 10);
      if (!seenIds.has(id)) {
        seenIds.add(id);
        displayOrder.push(id);
      }
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

  if (deletedIndex === -1) {
    return null;
  }

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

  if (deletedIndex === -1) {
    return null;
  }

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

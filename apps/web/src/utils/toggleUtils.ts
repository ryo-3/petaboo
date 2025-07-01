/**
 * Set の要素をトグル（追加/削除）するユーティリティ関数
 */
export function toggleSetItem<T>(currentSet: Set<T>, item: T): Set<T> {
  const newSet = new Set(currentSet);
  if (currentSet.has(item)) {
    newSet.delete(item);
  } else {
    newSet.add(item);
  }
  return newSet;
}

/**
 * チェックボックス切り替え用のハンドラーを生成
 */
export function createToggleHandler<T>(
  currentSet: Set<T>,
  setFunction: (newSet: Set<T>) => void
) {
  return (item: T) => {
    const newSet = toggleSetItem(currentSet, item);
    setFunction(newSet);
  };
}
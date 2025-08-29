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
  setFunction: (newSet: Set<T>) => void,
) {
  return (item: T) => {
    const newSet = toggleSetItem(currentSet, item);
    setFunction(newSet);
  };
}

/**
 * タブを跨いだ選択解除機能付きのトグルハンドラーを生成
 * 異なるタブでアイテムを選択すると、他のタブの選択は自動解除される
 */
export function createToggleHandlerWithTabClear<T>(
  currentSet: Set<T>,
  setCurrentFunction: (newSet: Set<T>) => void,
  otherTabsSetters: Array<(newSet: Set<number>) => void>,
) {
  return (item: T) => {
    // 現在のタブの選択を更新
    const newSet = toggleSetItem(currentSet, item);
    setCurrentFunction(newSet);

    // 他のタブの選択をクリア（選択が追加された場合のみ）
    if (!currentSet.has(item)) {
      // アイテムが新しく選択された場合
      otherTabsSetters.forEach((setter) => setter(new Set()));
    }
  };
}

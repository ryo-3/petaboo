import { useState, useCallback } from "react";

/**
 * Set状態管理用の共通フック
 * 選択状態、チェック状態、展開状態などの管理に使用
 */
export function useSetState<T>(initialValue?: Set<T>) {
  const [state, setState] = useState<Set<T>>(initialValue || new Set());

  const add = useCallback((item: T) => {
    setState((prev) => new Set([...prev, item]));
  }, []);

  const remove = useCallback((item: T) => {
    setState((prev) => {
      const newSet = new Set(prev);
      newSet.delete(item);
      return newSet;
    });
  }, []);

  const toggle = useCallback((item: T) => {
    setState((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  }, []);

  const clear = useCallback(() => {
    setState(new Set());
  }, []);

  const has = useCallback(
    (item: T) => {
      return state.has(item);
    },
    [state],
  );

  return {
    state,
    add,
    remove,
    toggle,
    clear,
    has,
    setState,
  };
}

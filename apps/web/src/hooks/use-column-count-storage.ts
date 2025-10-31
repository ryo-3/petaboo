import { useState, useCallback } from "react";

/**
 * 列数設定をlocalStorageで管理する共通フック
 * メモ・タスク個別に設定を保存
 */
export function useColumnCountStorage(type: "memo" | "task") {
  const storageKey = `${type}-column-count`;
  const defaultCount = type === "memo" ? 4 : 2;

  // localStorageから初期値を取得
  const [columnCount, setColumnCountState] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? parseInt(saved, 10) : null;
      if (parsed && parsed >= 1 && parsed <= 4) {
        return parsed;
      }
    }
    return defaultCount;
  });

  // columnCount変更時にlocalStorageに保存
  const setColumnCount = useCallback(
    (count: number) => {
      setColumnCountState(count);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, count.toString());
      }
    },
    [storageKey],
  );

  return [columnCount, setColumnCount] as const;
}

import { useState, useCallback } from "react";

/**
 * ビューモード設定をlocalStorageで管理する共通フック
 * メモ・タスク・ボード個別に設定を保存（個人・チーム共通）
 */
export function useViewModeStorage(type: "memo" | "task" | "board") {
  const storageKey = `${type}-view-mode`;
  const defaultMode = "list";

  // localStorageから初期値を取得
  const [viewMode, setViewModeState] = useState<"card" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      if (saved === "card" || saved === "list") {
        return saved;
      }
    }
    return defaultMode;
  });

  // viewMode変更時にlocalStorageに保存
  const setViewMode = useCallback(
    (mode: "card" | "list") => {
      setViewModeState(mode);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, mode);
      }
    },
    [storageKey],
  );

  return [viewMode, setViewMode] as const;
}

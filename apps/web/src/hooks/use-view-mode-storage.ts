import { useState, useCallback } from "react";

/**
 * ビューモード設定をlocalStorageで管理する共通フック
 * 全体で1つの共通設定（view-mode）を使用
 */
export function useViewModeStorage() {
  const storageKey = "view-mode";
  const defaultMode = "card";

  // localStorageから初期値を取得
  const [viewMode, setViewModeState] = useState<"card" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(storageKey);
      console.log(`📦 [ViewMode] localStorage読み込み:`, saved);
      if (saved === "card" || saved === "list") {
        console.log(`✅ [ViewMode] 初期値設定:`, saved);
        return saved;
      }
    }
    console.log(`📦 [ViewMode] デフォルト値使用:`, defaultMode);
    return defaultMode;
  });

  // viewMode変更時にlocalStorageに保存
  const setViewMode = useCallback((mode: "card" | "list") => {
    console.log(`🔄 [ViewMode] viewMode変更:`, mode);
    setViewModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, mode);
      console.log(`💾 [ViewMode] localStorage保存完了:`, mode);
    }
  }, []);

  return [viewMode, setViewMode] as const;
}

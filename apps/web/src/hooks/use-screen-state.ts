import React, { useState, useEffect } from "react";
import type { UserPreferences } from "@/src/contexts/user-preferences-context";

interface UseScreenStateConfig {
  type: "memo" | "task";
  defaultActiveTab: string;
  defaultColumnCount: number; // 後方互換性のため残す（実際には使われない）
}

interface ScreenStateReturn<T extends string> {
  // Screen mode
  screenMode: T;
  setScreenMode: (mode: T) => void;

  // Tab state
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function useScreenState<T extends string>(
  config: UseScreenStateConfig,
  initialScreenMode: T,
  selectedItem?: unknown,
  selectedDeletedItem?: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  preferences?: UserPreferences,
): ScreenStateReturn<T> {
  // Basic state: 画面モード + タブ管理のみ
  const [screenMode, setScreenMode] = useState<T>(initialScreenMode);
  const [activeTab, setActiveTab] = useState(config.defaultActiveTab);

  // アイテムが選択されている場合は表示モードに、選択がクリアされた場合は一覧モードに
  useEffect(() => {
    if ((selectedItem || selectedDeletedItem) && screenMode === ("list" as T)) {
      setScreenMode("view" as T);
    } else if (
      !selectedItem &&
      !selectedDeletedItem &&
      screenMode === ("view" as T)
    ) {
      setScreenMode("list" as T);
    }
  }, [selectedItem, selectedDeletedItem, screenMode]);

  return {
    screenMode,
    setScreenMode,
    activeTab,
    setActiveTab,
  };
}

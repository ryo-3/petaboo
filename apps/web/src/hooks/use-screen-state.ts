import React, { useState, useEffect } from "react";
import type { UserPreferences } from "@/src/contexts/user-preferences-context";
import { useViewModeStorage } from "@/src/hooks/use-view-mode-storage";
import { useColumnCountStorage } from "@/src/hooks/use-column-count-storage";

interface UseScreenStateConfig {
  type: "memo" | "task";
  defaultActiveTab: string;
  defaultColumnCount: number;
}

interface ScreenStateReturn<T extends string> {
  // Screen mode
  screenMode: T;
  setScreenMode: (mode: T) => void;

  // Tab state
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // View settings
  viewMode: "card" | "list";
  setViewMode: (mode: "card" | "list") => void;
  columnCount: number;
  setColumnCount: (count: number) => void;

  // Selection state
  checkedItems: Set<number>;
  setCheckedItems: React.Dispatch<React.SetStateAction<Set<number>>>;
  checkedDeletedItems: Set<number>;
  setCheckedDeletedItems: React.Dispatch<React.SetStateAction<Set<number>>>;

  // Computed values
  effectiveColumnCount: number;
}

export function useScreenState<T extends string>(
  config: UseScreenStateConfig,
  initialScreenMode: T,
  selectedItem?: unknown,
  selectedDeletedItem?: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  preferences?: UserPreferences,
): ScreenStateReturn<T> {
  // Basic state
  const [screenMode, setScreenMode] = useState<T>(initialScreenMode);
  const [activeTab, setActiveTab] = useState(config.defaultActiveTab);
  const [viewMode, setViewMode] = useViewModeStorage(config.type); // メモ・タスク個別のlocalStorage設定
  const [columnCount, setColumnCount] = useColumnCountStorage(config.type); // メモ・タスク個別のlocalStorage設定
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [checkedDeletedItems, setCheckedDeletedItems] = useState<Set<number>>(
    new Set(),
  );

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

  // 右側パネル表示時は列数を調整
  const effectiveColumnCount =
    screenMode !== ("list" as T)
      ? columnCount <= 2
        ? columnCount
        : 2
      : columnCount;

  return {
    screenMode,
    setScreenMode,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    columnCount,
    setColumnCount,
    checkedItems,
    setCheckedItems,
    checkedDeletedItems,
    setCheckedDeletedItems,
    effectiveColumnCount,
  };
}

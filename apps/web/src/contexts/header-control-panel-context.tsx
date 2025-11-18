"use client";

import { ReactNode, createContext, useContext, useMemo, useState } from "react";

export type HeaderControlPanelConfig = {
  // 基本設定
  currentMode: "memo" | "task" | "board";
  rightPanelMode: "hidden" | "view" | "create";

  // 選択モード
  selectionMode?: "select" | "check";
  onSelectionModeChange?: (mode: "select" | "check") => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;

  // ボード専用
  boardId?: number;
  onBoardSettings?: () => void;
  showMemo?: boolean;
  showTask?: boolean;
  showComment?: boolean;
  onMemoToggle?: (show: boolean) => void;
  onTaskToggle?: (show: boolean) => void;
  onCommentToggle?: (show: boolean) => void;
  contentFilterRightPanelMode?: "memo-list" | "task-list" | "editor" | null;

  // 選択時モード用
  isSelectedMode?: boolean;
  listTooltip?: string;
  detailTooltip?: string;
  selectedItemType?: "memo" | "task" | null;
  hideDetailButton?: boolean; // 詳細ボタンを非表示（個人ボード選択時）

  // CSV / エクスポート
  onCsvImport?: () => void;
  onBoardExport?: () => void;
  isExportDisabled?: boolean;

  // チーム関連
  teamMode?: boolean;
  teamId?: number;

  // タブ・カウント
  activeTab?: string;
  normalCount?: number;
  deletedMemosCount?: number;
  deletedTasksCount?: number;
  deletedCount?: number;
  todoCount?: number;
  inProgressCount?: number;
  completedCount?: number;

  // その他
  customTitle?: string;
  hideAddButton?: boolean;
  hideControls?: boolean;
};

type HeaderControlPanelContextType = {
  config: HeaderControlPanelConfig | null;
  setConfig: (config: HeaderControlPanelConfig | null) => void;
};

const HeaderControlPanelContext = createContext<
  HeaderControlPanelContextType | undefined
>(undefined);

export function HeaderControlPanelProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [config, setConfig] = useState<HeaderControlPanelConfig | null>(null);

  const value = useMemo(() => ({ config, setConfig }), [config, setConfig]);

  return (
    <HeaderControlPanelContext.Provider value={value}>
      {children}
    </HeaderControlPanelContext.Provider>
  );
}

export function useHeaderControlPanel() {
  const context = useContext(HeaderControlPanelContext);
  if (!context) {
    throw new Error(
      "useHeaderControlPanel must be used within HeaderControlPanelProvider",
    );
  }
  return context;
}

"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useTeamContext } from "@/contexts/team-context";

// ============================================================
// 型定義
// ============================================================

/**
 * localStorage永続化される表示設定
 */
export interface ViewSettings {
  // カラム数
  memoColumnCount: number;
  taskColumnCount: number;
  boardColumnCount: number;

  // コントロールパネル表示/非表示
  memoHideControls: boolean;
  taskHideControls: boolean;
  hideHeader: boolean;

  // 表示切り替え
  showTagDisplay: boolean; // タグ表示（ボード詳細用）
}

/**
 * セッション限りの状態（メモリのみ、ページリロードでリセット）
 */
export interface SessionState {
  // タグフィルター
  selectedTagIds: number[];
  tagFilterMode: "include" | "exclude";

  // ボードフィルター
  selectedBoardIds: number[];
  boardFilterMode: "include" | "exclude";

  // ソート設定
  sortOptions: Array<{
    id: "createdAt" | "updatedAt" | "priority" | "deletedAt" | "dueDate";
    label: string;
    enabled: boolean;
    direction: "asc" | "desc";
  }>;

  // 統合フィルターモーダル
  filterModalOpen: boolean;
  activeFilterTab: "tag" | "board";
}

/**
 * Context型
 */
export interface ViewSettingsContextType {
  // localStorage永続化設定
  settings: ViewSettings;
  updateSettings: (updates: Partial<ViewSettings>) => void;

  // セッション状態
  sessionState: SessionState;
  updateSessionState: (updates: Partial<SessionState>) => void;

  // チーム情報
  teamMode: boolean;
  teamId?: number;

  // ユーティリティ
  resetFilters: () => void;
  resetAllSettings: () => void;

  // フィルターモーダル専用ヘルパー
  openFilterModal: (tab?: "tag" | "board") => void;
  closeFilterModal: () => void;
  clearCurrentFilter: () => void;
  getActiveFilterCount: () => number;
}

// ============================================================
// デフォルト値
// ============================================================

const DEFAULT_SETTINGS: ViewSettings = {
  memoColumnCount: 4,
  taskColumnCount: 2,
  boardColumnCount: 3,
  memoHideControls: false,
  taskHideControls: false,
  hideHeader: false,
  showTagDisplay: true,
};

const DEFAULT_SESSION_STATE: SessionState = {
  selectedTagIds: [],
  tagFilterMode: "include",
  selectedBoardIds: [],
  boardFilterMode: "include",
  sortOptions: [],
  filterModalOpen: false,
  activeFilterTab: "tag",
};

// ============================================================
// Context作成
// ============================================================

const ViewSettingsContext = createContext<ViewSettingsContextType | undefined>(
  undefined,
);

// ============================================================
// Provider
// ============================================================

interface ViewSettingsProviderProps {
  userId: number | string;
  children: React.ReactNode;
}

export function ViewSettingsProvider({
  userId,
  children,
}: ViewSettingsProviderProps) {
  // TeamContextから動的に取得（チームページでのみ利用可能）
  const teamContext = useTeamContext();
  const teamMode = teamContext?.isTeamMode ?? false;
  const teamId = teamContext?.teamId ?? undefined;

  const [settings, setSettings] = useState<ViewSettings>(DEFAULT_SETTINGS);
  const [sessionState, setSessionState] = useState<SessionState>(
    DEFAULT_SESSION_STATE,
  );

  // localStorageキー
  const STORAGE_KEY = `petaboo_view_settings_${userId}`;

  // ============================================================
  // 初期化: localStorageから読み込み
  // ============================================================
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error("Failed to load view settings from localStorage:", error);
    }
  }, [STORAGE_KEY]);

  // ============================================================
  // 設定更新: localStorageに保存
  // ============================================================
  const updateSettings = useCallback(
    (updates: Partial<ViewSettings>) => {
      setSettings((prev) => {
        const newSettings = { ...prev, ...updates };

        // localStorageに保存
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        } catch (error) {
          console.error("Failed to save view settings to localStorage:", error);
        }

        return newSettings;
      });
    },
    [STORAGE_KEY],
  );

  // ============================================================
  // セッション状態更新
  // ============================================================
  const updateSessionState = useCallback((updates: Partial<SessionState>) => {
    setSessionState((prev) => ({ ...prev, ...updates }));
  }, []);

  // ============================================================
  // フィルターリセット
  // ============================================================
  const resetFilters = useCallback(() => {
    setSessionState((prev) => ({
      ...prev,
      selectedTagIds: [],
      selectedBoardIds: [],
      tagFilterMode: "include",
      boardFilterMode: "include",
    }));
  }, []);

  // ============================================================
  // 全設定リセット
  // ============================================================
  const resetAllSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    setSessionState(DEFAULT_SESSION_STATE);

    // localStorageも削除
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to remove view settings from localStorage:", error);
    }
  }, [STORAGE_KEY]);

  // ============================================================
  // フィルターモーダルヘルパー
  // ============================================================

  const openFilterModal = useCallback((tab?: "tag" | "board") => {
    setSessionState((prev) => ({
      ...prev,
      filterModalOpen: true,
      activeFilterTab: tab ?? prev.activeFilterTab,
    }));
  }, []);

  const closeFilterModal = useCallback(() => {
    setSessionState((prev) => ({
      ...prev,
      filterModalOpen: false,
    }));
  }, []);

  const clearCurrentFilter = useCallback(() => {
    setSessionState((prev) => {
      if (prev.activeFilterTab === "tag") {
        return {
          ...prev,
          selectedTagIds: [],
        };
      } else {
        return {
          ...prev,
          selectedBoardIds: [],
        };
      }
    });
  }, []);

  const getActiveFilterCount = useCallback(() => {
    return (
      sessionState.selectedTagIds.length + sessionState.selectedBoardIds.length
    );
  }, [
    sessionState.selectedTagIds.length,
    sessionState.selectedBoardIds.length,
  ]);

  // ============================================================
  // Context Value
  // ============================================================

  const value: ViewSettingsContextType = {
    settings,
    updateSettings,
    sessionState,
    updateSessionState,
    teamMode,
    teamId,
    resetFilters,
    resetAllSettings,
    openFilterModal,
    closeFilterModal,
    clearCurrentFilter,
    getActiveFilterCount,
  };

  return (
    <ViewSettingsContext.Provider value={value}>
      {children}
    </ViewSettingsContext.Provider>
  );
}

// ============================================================
// Custom Hook
// ============================================================

export function useViewSettings() {
  const context = useContext(ViewSettingsContext);
  if (!context) {
    throw new Error("useViewSettings must be used within ViewSettingsProvider");
  }
  return context;
}

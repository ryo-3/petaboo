"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import type { Memo } from "@/src/types/memo";
import type { Task } from "@/src/types/task";
import { usePathname, useSearchParams } from "next/navigation";

type ScreenMode =
  | "home"
  | "memo"
  | "task"
  | "create"
  | "search"
  | "settings"
  | "board"
  | "welcome"
  | "team"
  | "loading";

export interface IconStates {
  home: boolean;
  memo: boolean;
  task: boolean;
  board: boolean;
  boardDetail: boolean;
  search: boolean;
  settings: boolean;
  team: boolean;
}

interface NavigationContextType {
  screenMode: ScreenMode;
  currentMode: "memo" | "task" | "board";
  setScreenMode: (mode: ScreenMode) => void;
  setCurrentMode: (mode: "memo" | "task" | "board") => void;
  isFromBoardDetail: boolean;
  setIsFromBoardDetail: (value: boolean) => void;
  iconStates: IconStates;
  // 楽観的更新（即座にアイコンを切り替える）
  setOptimisticMode: (mode: "memo" | "task" | "board" | null) => void;
  // UI状態管理（Sidebarとの統一のため）
  showTeamList: boolean;
  setShowTeamList: (show: boolean) => void;
  showTeamCreate: boolean;
  setShowTeamCreate: (show: boolean) => void;
  showingBoardDetail: boolean;
  setShowingBoardDetail: (show: boolean) => void;
  // 個人モードの新規作成状態（モバイルフッター切り替え用）
  isCreatingMemo: boolean;
  setIsCreatingMemo: (isCreating: boolean) => void;
  isCreatingTask: boolean;
  setIsCreatingTask: (isCreating: boolean) => void;
  // メイン画面のアイテム選択ハンドラー
  handleMainSelectMemo?: (memo: Memo | null) => void;
  handleMainSelectTask?: (task: Task | null) => void;
  setHandleMainSelectMemo?: (
    handler: ((memo: Memo | null) => void) | undefined,
  ) => void;
  setHandleMainSelectTask?: (
    handler: ((task: Task | null) => void) | undefined,
  ) => void;
  // セレクター制御（SelectorContextから移行）
  activeSelector: string | null;
  setActiveSelector: (id: string | null) => void;
  // アップロード中状態管理
  isUploadingTask: boolean;
  setIsUploadingTask: (uploading: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

interface NavigationProviderProps {
  children: ReactNode;
  initialCurrentMode?: "memo" | "task" | "board";
  initialScreenMode?: ScreenMode;
  initialShowingBoardDetail?: boolean;
}

export function NavigationProvider({
  children,
  initialCurrentMode = "memo",
  initialScreenMode = "home",
  initialShowingBoardDetail = false,
}: NavigationProviderProps) {
  const [screenMode, setScreenModeInternal] =
    useState<ScreenMode>(initialScreenMode);
  const [currentMode, setCurrentModeInternal] = useState<
    "memo" | "task" | "board"
  >(initialCurrentMode);

  // モード切り替え関数（useCallback で安定化）
  const setScreenMode = useCallback((mode: ScreenMode) => {
    setScreenModeInternal(mode);
  }, []);

  const setCurrentMode = useCallback((mode: "memo" | "task" | "board") => {
    setCurrentModeInternal(mode);
  }, []);
  const [isFromBoardDetail, setIsFromBoardDetail] = useState(false);
  const [handleMainSelectMemo, setHandleMainSelectMemo] = useState<
    ((memo: Memo | null) => void) | undefined
  >();
  const [handleMainSelectTask, setHandleMainSelectTask] = useState<
    ((task: Task | null) => void) | undefined
  >();

  // UI状態管理（Sidebarとの統一）
  const [showTeamList, setShowTeamList] = useState(false);
  const [showTeamCreate, setShowTeamCreate] = useState(false);
  const [showingBoardDetail, setShowingBoardDetailInternal] = useState(
    initialShowingBoardDetail,
  );

  const setShowingBoardDetail = useCallback((show: boolean) => {
    setShowingBoardDetailInternal(show);
  }, []);

  // 個人モードの新規作成状態（モバイルフッター切り替え用）
  const [isCreatingMemo, setIsCreatingMemo] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  // セレクター制御（SelectorContextから移行）
  const [activeSelector, setActiveSelectorInternal] = useState<string | null>(
    null,
  );

  const setActiveSelector = useCallback((id: string | null) => {
    setActiveSelectorInternal(id);
  }, []);

  // アップロード中状態管理
  const [isUploadingTask, setIsUploadingTask] = useState(false);

  // 楽観的更新用の一時的なモード（URL変更前に即座に反映）
  const [optimisticMode, setOptimisticMode] = useState<
    "memo" | "task" | "board" | null
  >(null);

  // チーム詳細ページの即座のタブ切り替え用（URL更新前の状態）
  const [teamActiveTab, setTeamActiveTab] = useState<string | null>(null);

  const pathname = usePathname();

  const searchParams = useSearchParams();

  // Sidebarの詳細なiconStates計算ロジック（統一版・最適化・楽観的更新対応）
  const iconStates = useMemo((): IconStates => {
    const currentTab = searchParams.get("tab");

    // URLパターンの早期判定
    const isTeamDetailPageUrl =
      pathname.startsWith("/team/") && pathname !== "/team";

    // チーム詳細ページのタブ判定（最適化・楽観的更新対応）
    if (isTeamDetailPageUrl) {
      // teamActiveTabがあればそれを優先、なければURLパラメータを使用（即座の反映）
      const activeTab = teamActiveTab || currentTab;
      const currentSlug = searchParams.get("slug");

      // チームボード詳細はクエリパラメータ形式（?tab=board&slug=xxx）
      const isTeamBoardDetailPage =
        activeTab === "board" && currentSlug !== null;
      const isTeamSettingsTab = activeTab === "team-settings";

      // 楽観的モードがある場合は即座に反映
      const effectiveTab = optimisticMode
        ? optimisticMode === "memo"
          ? "memos"
          : optimisticMode === "task"
            ? "tasks"
            : "boards"
        : activeTab;

      return {
        home: !effectiveTab || effectiveTab === "overview",
        memo: effectiveTab === "memos" || optimisticMode === "memo",
        task: effectiveTab === "tasks" || optimisticMode === "task",
        board:
          (effectiveTab === "boards" || optimisticMode === "board") &&
          !isTeamBoardDetailPage,
        boardDetail:
          isTeamBoardDetailPage &&
          optimisticMode !== "memo" &&
          optimisticMode !== "task" &&
          optimisticMode !== "board",
        search: activeTab === "search",
        settings: isTeamSettingsTab,
        team:
          effectiveTab === "team-list" ||
          (!effectiveTab && screenMode === "team"),
      };
    }

    // 個人ページの判定（screenModeベース・楽観的更新対応）
    const effectiveMode = optimisticMode || currentMode;
    const boardDetailActive = effectiveMode === "board" && showingBoardDetail;

    // ホーム画面表示中は、currentModeに関わらずhomeアイコンのみ有効化
    const isHomeScreen = screenMode === "home" && !showTeamList;

    // 検索・設定・チーム画面では他のアイコンを無効化
    const isTeamScreen =
      pathname === "/team" ||
      showTeamList ||
      showTeamCreate ||
      screenMode === "team";
    const isExclusiveScreen =
      screenMode === "search" || screenMode === "settings" || isTeamScreen;

    const result = {
      home: isHomeScreen,
      memo: !isHomeScreen && !isExclusiveScreen && effectiveMode === "memo",
      task: !isHomeScreen && !isExclusiveScreen && effectiveMode === "task",
      board:
        !isHomeScreen &&
        !isExclusiveScreen &&
        effectiveMode === "board" &&
        !boardDetailActive,
      boardDetail: !isExclusiveScreen && boardDetailActive,
      search: screenMode === "search",
      settings: screenMode === "settings",
      team: isTeamScreen,
    };

    return result;
  }, [
    screenMode,
    currentMode,
    pathname,
    searchParams,
    showTeamList,
    showTeamCreate,
    showingBoardDetail,
    optimisticMode,
    teamActiveTab,
  ]);

  // URL変更時にoptimisticModeとteamActiveTabをクリア
  useEffect(() => {
    setOptimisticMode(null);
    setTeamActiveTab(null);
  }, [pathname, searchParams]);

  // チーム詳細ページのタブ変更を即座に反映
  useEffect(() => {
    const handleTeamTabChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { activeTab } = customEvent.detail;
      setTeamActiveTab(activeTab);
    };

    window.addEventListener("team-tab-change", handleTeamTabChange);

    return () => {
      window.removeEventListener("team-tab-change", handleTeamTabChange);
    };
  }, []);

  // TODO: 必要に応じて個別キャッシュ無効化を実装する
  // - メモ画面: 特定カテゴリや長時間経過時のみ無効化
  // - タスク画面: 特定カテゴリや長時間経過時のみ無効化
  // - ボード画面: 特定ボードや長時間経過時のみ無効化
  // 現在はチーム申請通知のみ useTeamApplicationsPolling で実装済み

  return (
    <NavigationContext.Provider
      value={{
        screenMode,
        currentMode,
        setScreenMode,
        setCurrentMode,
        isFromBoardDetail,
        setIsFromBoardDetail,
        iconStates,
        setOptimisticMode,
        showTeamList,
        setShowTeamList,
        showTeamCreate,
        setShowTeamCreate,
        showingBoardDetail,
        setShowingBoardDetail,
        isCreatingMemo,
        setIsCreatingMemo,
        isCreatingTask,
        setIsCreatingTask,
        handleMainSelectMemo,
        handleMainSelectTask,
        setHandleMainSelectMemo,
        setHandleMainSelectTask,
        activeSelector,
        setActiveSelector,
        isUploadingTask,
        setIsUploadingTask,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}

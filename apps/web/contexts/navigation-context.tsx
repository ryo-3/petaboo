"use client";

import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useMemo,
  useEffect,
} from "react";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";
import { usePathname, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

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
  // メイン画面のアイテム選択ハンドラー
  handleMainSelectMemo?: (memo: Memo | null) => void;
  handleMainSelectTask?: (task: Task | null) => void;
  setHandleMainSelectMemo?: (
    handler: ((memo: Memo | null) => void) | undefined,
  ) => void;
  setHandleMainSelectTask?: (
    handler: ((task: Task | null) => void) | undefined,
  ) => void;
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
  const [screenMode, setScreenMode] = useState<ScreenMode>(initialScreenMode);
  const [currentMode, setCurrentMode] = useState<"memo" | "task" | "board">(
    initialCurrentMode,
  );
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
  const [showingBoardDetail, setShowingBoardDetail] = useState(
    initialShowingBoardDetail,
  );

  // 楽観的更新用の一時的なモード（URL変更前に即座に反映）
  const [optimisticMode, setOptimisticMode] = useState<
    "memo" | "task" | "board" | null
  >(null);

  const pathname = usePathname();

  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  // Sidebarの詳細なiconStates計算ロジック（統一版・最適化・楽観的更新対応）
  const iconStates = useMemo((): IconStates => {
    const currentTab = searchParams.get("tab");

    // URLパターンの早期判定
    const isTeamDetailPageUrl =
      pathname.startsWith("/team/") && pathname !== "/team";
    const isBoardPath = pathname.includes("/board/");

    // チーム詳細ページのタブ判定（最適化・楽観的更新対応）
    if (isTeamDetailPageUrl) {
      const isTeamBoardDetailPage = isBoardPath;
      const isTeamSettingsTab = currentTab === "team-settings";

      // 楽観的モードがある場合は即座に反映
      const effectiveTab = optimisticMode
        ? optimisticMode === "memo"
          ? "memos"
          : optimisticMode === "task"
            ? "tasks"
            : "boards"
        : currentTab;

      return {
        home: !effectiveTab || effectiveTab === "overview",
        memo: effectiveTab === "memos" || optimisticMode === "memo",
        task: effectiveTab === "tasks" || optimisticMode === "task",
        board:
          (effectiveTab === "boards" || optimisticMode === "board") &&
          !isTeamBoardDetailPage,
        boardDetail: isTeamBoardDetailPage,
        search: currentTab === "search",
        settings: isTeamSettingsTab,
        team:
          effectiveTab === "team-list" ||
          (!effectiveTab && screenMode === "team"),
      };
    }

    // 個人ページの判定（screenModeベース・楽観的更新対応）
    const effectiveMode = optimisticMode || currentMode;
    const boardDetailActive = effectiveMode === "board" && showingBoardDetail;

    return {
      home: screenMode === "home" && !showTeamList,
      memo: screenMode === "memo" || optimisticMode === "memo",
      task: screenMode === "task" || optimisticMode === "task",
      board:
        (screenMode === "board" || optimisticMode === "board") &&
        !boardDetailActive,
      boardDetail: boardDetailActive,
      search: screenMode === "search",
      settings: screenMode === "settings",
      team:
        pathname === "/team" ||
        showTeamList ||
        showTeamCreate ||
        screenMode === "team",
    };
  }, [
    screenMode,
    currentMode,
    pathname,
    searchParams,
    showTeamList,
    showTeamCreate,
    showingBoardDetail,
    optimisticMode,
  ]);

  // URL変更時にoptimisticModeをクリア
  useEffect(() => {
    setOptimisticMode(null);
  }, [pathname, searchParams]);

  // デバッグ用: スクリーンモード変更をログ出力
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    const teamName =
      pathname.startsWith("/team/") && pathname !== "/team"
        ? pathname.split("/")[2]
        : undefined;

    // URL情報の詳細取得
    const internalPath = pathname;
    const queryString = searchParams.toString();
    const fullInternalUrl = queryString
      ? `${internalPath}?${queryString}`
      : internalPath;
    const actualDisplayUrl = window.location.href;

    // シンプルなログ出力
    const logInfo = [
      `mode:${screenMode}`,
      `path:${pathname}`,
      currentTab && `tab:${currentTab}`,
      teamName && `team:${teamName}`,
      `icons:${
        Object.entries(iconStates)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(",") || "none"
      }`,
    ]
      .filter(Boolean)
      .join(" | ");

    // console.log(`🎯 [Navigation] ${logInfo} (${actualDisplayUrl})`);
  }, [screenMode, pathname, searchParams, iconStates]);

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
        handleMainSelectMemo,
        handleMainSelectTask,
        setHandleMainSelectMemo,
        setHandleMainSelectTask,
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

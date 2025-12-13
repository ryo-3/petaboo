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
import {
  getTabFromParams,
  getBoardSlugFromParams,
} from "@/src/utils/teamUrlUtils";

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
  // URLからteam-list/team-createを検知して初期化
  const [showTeamList, setShowTeamList] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.has("team-list");
  });
  const [showTeamCreate, setShowTeamCreate] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.has("team-create");
  });
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

  const pathname = usePathname();

  const searchParams = useSearchParams();

  // Sidebarの詳細なiconStates計算ロジック（統一版・最適化・楽観的更新対応）
  const iconStates = useMemo((): IconStates => {
    // URLパターンの早期判定
    const isTeamDetailPageUrl =
      pathname.startsWith("/team/") && pathname !== "/team";

    // チーム詳細ページのタブ判定（共通ユーティリティを使用）
    if (isTeamDetailPageUrl) {
      const boardSlugFromParams = getBoardSlugFromParams(searchParams);
      const activeTab = getTabFromParams(searchParams);

      // チームボード詳細はクエリパラメータ形式（新形式: ?SLUG, 旧形式: ?board=xxx, レガシー: ?tab=board&slug=xxx）
      const isTeamBoardDetailPage =
        activeTab === "board" && boardSlugFromParams !== null;
      const isTeamSettingsTab = activeTab === "team-settings";

      // 楽観的モードがある場合は即座に反映
      const effectiveTab = optimisticMode
        ? optimisticMode === "memo"
          ? "memos"
          : optimisticMode === "task"
            ? "tasks"
            : "boards"
        : activeTab;

      // 招待パネル表示中かどうか（URLにinviteパラメータがあるか）
      // ※Next.jsのルーターが大文字に変換する場合があるため両方チェック
      const isInvitePanel =
        searchParams.has("invite") || searchParams.has("INVITE");

      const result = {
        home: !isInvitePanel && (!effectiveTab || effectiveTab === "overview"),
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
          isInvitePanel ||
          effectiveTab === "team-list" ||
          (!effectiveTab && screenMode === "team"),
      };

      return result;
    }

    // 個人ページの判定（screenModeベース・楽観的更新対応）
    const effectiveMode = optimisticMode || currentMode;

    // 個人側のボードslugをURLから取得（チーム側と同じ形式: ?board=SLUG）
    const getPersonalBoardSlugFromParams = (): string | null => {
      // 新形式: ?board=SLUG
      const boardParam = searchParams.get("board");
      if (boardParam) return boardParam.toUpperCase();

      // 旧形式との互換性: ?SLUG（値が空のキー）
      const excludeKeys = [
        "mode",
        "search",
        "memo",
        "task",
        "boards",
        "settings",
        "team-list",
        "team-create",
      ];
      for (const [key, value] of searchParams.entries()) {
        if (value === "" && !excludeKeys.includes(key)) {
          return key.toUpperCase();
        }
      }
      return null;
    };
    const personalBoardSlugFromUrl = getPersonalBoardSlugFromParams();

    // 個人ボード詳細ページ（/boards/[slug] または ?SLUG 形式）
    const isPersonalBoardPage =
      pathname.startsWith("/boards/") && pathname !== "/boards";

    // ボード詳細アクティブ: showingBoardDetailを最優先（state変更は即座に反映される）
    // URLベースの判定は補助的に使用
    const boardDetailActive =
      showingBoardDetail ||
      personalBoardSlugFromUrl !== null ||
      isPersonalBoardPage;

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

    // 楽観的モードが設定されている場合、ボード詳細をオフにする
    // （メモ/タスク一覧に切り替える際に即座にボード詳細アイコンをオフにする）
    const shouldHideBoardDetail = optimisticMode !== null;

    const result = {
      home: isHomeScreen,
      memo: !isHomeScreen && !isExclusiveScreen && effectiveMode === "memo",
      task: !isHomeScreen && !isExclusiveScreen && effectiveMode === "task",
      board:
        !isHomeScreen &&
        !isExclusiveScreen &&
        effectiveMode === "board" &&
        !boardDetailActive,
      boardDetail:
        !isExclusiveScreen && boardDetailActive && !shouldHideBoardDetail,
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
  ]);

  // URL変更時にoptimisticModeをクリア（期待したタブになったときのみ）
  useEffect(() => {
    if (optimisticMode === null) return;

    // チーム詳細ページの場合、URLから実際のタブを取得して比較
    const isTeamDetailPageUrl =
      pathname.startsWith("/team/") && pathname !== "/team";

    if (isTeamDetailPageUrl) {
      const actualTab = getTabFromParams(searchParams);
      const expectedTab =
        optimisticMode === "memo"
          ? "memos"
          : optimisticMode === "task"
            ? "tasks"
            : "boards";

      // 期待したタブに実際になった場合のみクリア
      if (actualTab === expectedTab) {
        setOptimisticMode(null);
      }
    } else {
      // 個人ページの場合はcurrentModeで判定
      if (currentMode === optimisticMode) {
        setOptimisticMode(null);
      }
    }
  }, [pathname, searchParams, optimisticMode, currentMode]);

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

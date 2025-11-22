"use client";

import { BoardScreenRef } from "@/components/screens/board-screen";
import { ErrorDisplay } from "@/components/ui/error-display";
import { MainClientDesktop } from "./main-client-desktop";
import { MainContentArea } from "./main-content-area";
import { useBoardBySlug, useBoardWithItems } from "@/src/hooks/use-boards";
import { useMainClientHandlers } from "@/src/hooks/use-main-client-handlers";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import type { DeletedTask, Task } from "@/src/types/task";
import { useNavigation } from "@/src/contexts/navigation-context";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import { useToast } from "@/src/contexts/toast-context";
import { useQueryClient } from "@tanstack/react-query";

interface MainClientProps {
  initialBoardName?: string;
  boardId?: number;
  boardSlug?: string;
  showBoardHeader?: boolean;
  serverBoardTitle?: string;
  serverBoardDescription?: string | null;
  forceShowBoardDetail?: boolean;
  teamMode?: boolean;
  teamId?: number;
}

function MainClient({
  initialBoardName,
  boardId,
  boardSlug,
  showBoardHeader = true,
  serverBoardTitle,
  serverBoardDescription,
  forceShowBoardDetail = false,
  teamMode = false,
  teamId,
}: MainClientProps) {
  // ==========================================
  // State管理
  // ==========================================

  // ユーザー設定取得
  const { preferences } = useUserPreferences(1);
  const pathname = usePathname();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // コンテキストから状態を取得
  const {
    screenMode,
    currentMode,
    setScreenMode,
    setCurrentMode,
    isFromBoardDetail,
    setIsFromBoardDetail,
    setHandleMainSelectMemo,
    setHandleMainSelectTask,
  } = useNavigation();

  // refs
  const boardScreenRef = useRef<BoardScreenRef>(null);

  // 現在のボードslug取得（プロパティまたはパスから）
  const currentBoardSlug =
    boardSlug ||
    (pathname.startsWith("/boards/") ? pathname.split("/")[2] : null);

  // サーバーサイドでボード情報が取得済みの場合は不要なAPI呼び出しを回避
  const shouldFetchBoardFromSlug = !boardId && currentBoardSlug;
  const { data: boardFromSlug } = useBoardBySlug(
    shouldFetchBoardFromSlug ? currentBoardSlug : null,
  );
  const { data: currentBoard } = useBoardWithItems(
    boardId || boardFromSlug?.id || null,
  );

  // 選択中アイテム管理
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [selectedDeletedMemo, setSelectedDeletedMemo] =
    useState<DeletedMemo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDeletedTask, setSelectedDeletedTask] =
    useState<DeletedTask | null>(null);

  // ボード詳細用の選択状態（Fast Refresh対応）
  const [boardSelectedItem, setBoardSelectedItem] = useState<
    | { type: "memo"; item: Memo | DeletedMemo }
    | { type: "task"; item: Task | DeletedTask }
    | null
  >(null);

  // UI状態管理
  const [showDeleted, setShowDeleted] = useState(false); // モバイル版削除済み表示フラグ

  // NavigationContextから統一された状態を取得
  const {
    showTeamList,
    setShowTeamList,
    showTeamCreate,
    setShowTeamCreate,
    showingBoardDetail,
    setShowingBoardDetail,
  } = useNavigation();

  // 初期値設定（一度だけ実行、ユーザーの手動切り替えは除外）
  const hasUserManuallyChanged = useRef(false);

  useEffect(() => {
    // ユーザーが手動で切り替えた場合は初期設定をスキップ
    if (hasUserManuallyChanged.current) return;

    // サーバーサイドから明示的に指示されている場合は詳細表示
    // または、ボード情報が渡されている場合、URLがボード詳細の場合は詳細表示
    const initialShowingBoardDetail =
      forceShowBoardDetail ||
      Boolean(boardId || initialBoardName || pathname.startsWith("/boards/"));

    if (initialShowingBoardDetail && !showingBoardDetail) {
      setShowingBoardDetail(true);
    }
  }, [
    forceShowBoardDetail,
    boardId,
    initialBoardName,
    pathname,
    showingBoardDetail,
    setShowingBoardDetail,
  ]); // ボード詳細表示フラグ

  // URLに基づいてscreenModeを設定（手動設定時は上書きしない）
  useLayoutEffect(() => {
    if (pathname.startsWith("/boards/") || pathname.includes("/board/")) {
      // ボード詳細URLでは基本的にボードモードに設定
      setScreenMode("board");
      setCurrentMode("board");
      // チームボード詳細の場合は詳細表示フラグも設定
      if (pathname.includes("/board/")) {
        setShowingBoardDetail(true);
      }
      // showingBoardDetailは初回のみ設定（ユーザーの手動切り替えを尊重）
    } else if (pathname === "/") {
      // ボード削除成功後のフラグをチェック
      const boardDeleted = sessionStorage.getItem("boardDeleted");
      console.log(
        "🏠 個人モード: pathname =",
        pathname,
        "boardDeleted =",
        boardDeleted,
      );
      if (boardDeleted === "true") {
        sessionStorage.removeItem("boardDeleted");
        console.log("🗑️ sessionStorageフラグ削除");
        // ボード一覧のキャッシュを完全削除して最新データを取得
        console.log("♻️ キャッシュ完全削除");
        ["normal", "completed", "deleted"].forEach((status) => {
          queryClient.removeQueries({
            queryKey: ["boards", status],
          });
        });
        console.log("🍞 トースト表示!");
        showToast("ボードが削除されました", "success");
      }

      // チーム作成成功後のフラグをチェック
      const shouldShowTeamList = sessionStorage.getItem(
        "showTeamListAfterCreation",
      );
      if (shouldShowTeamList === "true") {
        setShowTeamList(true);
        setScreenMode("team"); // チーム一覧表示時はteamモードに設定
        sessionStorage.removeItem("showTeamListAfterCreation"); // フラグを削除
      } else {
        // ルートページではホーム画面を表示
        if (screenMode !== "home") {
          setScreenMode("home");
        }
        if (isFromBoardDetail) {
          // ボード詳細から戻った場合
          setIsFromBoardDetail(false); // フラグをリセット
        }
        // ルートページではボード一覧表示
        if (screenMode === "board") {
          setShowingBoardDetail(false);
        }
      }
    }
    // ルートパス("/")でもユーザーが手動で切り替えた場合はホームに戻さない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pathname,
    isFromBoardDetail,
    setScreenMode,
    setCurrentMode,
    setIsFromBoardDetail,
    setShowingBoardDetail,
    showToast,
  ]);

  // Hydration完了前はサーバーと同じ状態を保持
  // サイドバーが表示されない問題を避けるため、早期リターンを削除
  // if (!isHydrated) {
  //   return null; // またはローディングスピナーなど
  // }

  // エラー管理（将来的にAPI同期エラー表示用）
  const errors: string[] = [];
  const clearErrors = () => {};

  // チーム一覧ハンドラー
  const handleTeamList = () => {
    if (showTeamList) {
      // チーム一覧を閉じる場合は、元のホームに戻る
      setShowTeamList(false);
      setScreenMode("home");
    } else {
      // チーム一覧を開く場合は、他のモードをリセット
      setShowTeamList(true);
      setShowTeamCreate(false);
      setScreenMode("team"); // チーム一覧表示時はteamモードに設定
    }
  };

  // チーム作成ハンドラー
  const handleTeamCreate = () => {
    setShowTeamCreate(true);
    setShowTeamList(false);
    setScreenMode("team");
  };

  // チーム作成完了ハンドラー
  const handleTeamCreated = () => {
    setShowTeamCreate(false);
    setShowTeamList(true);
    setScreenMode("team");
  };

  // 他のハンドラーをラップしてチーム表示をリセット
  const wrappedHandleHome = () => {
    setShowTeamList(false);
    setShowTeamCreate(false);
    handleHome();
  };

  const wrappedHandleShowList = (mode: "memo" | "task" | "board") => {
    setShowTeamList(false);
    setShowTeamCreate(false);
    handleShowList(mode);
  };

  const wrappedHandleDashboard = () => {
    setShowTeamList(false);
    setShowTeamCreate(false);
    hasUserManuallyChanged.current = true; // ユーザーが手動で切り替えたことを記録
    setShowingBoardDetail(false); // ボード一覧を表示
    handleDashboard();
  };

  const wrappedHandleBoardDetail = () => {
    hasUserManuallyChanged.current = true; // ユーザーが手動で切り替えたことを記録
    setShowingBoardDetail(true); // ボード詳細を表示
    handleBoardDetail();
  };

  const wrappedHandleSettings = () => {
    setShowTeamList(false);
    setShowTeamCreate(false);
    handleSettings();
  };

  const wrappedHandleSearch = () => {
    setShowTeamList(false);
    setShowTeamCreate(false);
    handleSearch();
  };

  // ハンドラー関数群をカスタムフックから取得
  const {
    handleSelectMemo,
    handleSelectDeletedMemo,
    handleSelectTask,
    handleSelectDeletedTask,
    handleEditMemo,
    handleEditTask,
    handleDeleteMemo,
    handleHome,
    handleSettings,
    handleSearch,
    handleDashboard,
    handleBoardDetail,
    handleNewMemo,
    handleNewTask,
    handleNewBoard,
    handleClose,
    handleShowList,
    handleBoardSelectMemo,
    handleBoardSelectTask,
    handleBoardClearSelection,
    handleBackToMemos,
  } = useMainClientHandlers({
    setSelectedMemo,
    setSelectedDeletedMemo,
    setSelectedTask,
    setSelectedDeletedTask,
    setShowDeleted,
    setBoardSelectedItem,
    setShowingBoardDetail,
    boardSelectedItem,
  });

  // ハンドラーをNavigationContextに設定
  useEffect(() => {
    if (setHandleMainSelectMemo && setHandleMainSelectTask) {
      setHandleMainSelectMemo(() => handleSelectMemo);
      setHandleMainSelectTask(() => handleSelectTask);
    }
  }, [
    handleSelectMemo,
    handleSelectTask,
    setHandleMainSelectMemo,
    setHandleMainSelectTask,
  ]);

  // 個人モードの新規作成イベントリスナー
  useEffect(() => {
    const handlePersonalMemoCreate = () => {
      // CreateScreenではなくMemoScreenの新規作成モードに移行
      setCurrentMode("memo");
      setScreenMode("memo");
      setSelectedMemo(null); // 選択解除
      // MemoScreen側のイベントリスナーが "personal-memo-create" を受け取って新規作成モードに移行
    };

    const handlePersonalTaskCreate = () => {
      // CreateScreenではなくTaskScreenの新規作成モードに移行
      setCurrentMode("task");
      setScreenMode("task");
      setSelectedTask(null); // 選択解除
      // TaskScreen側のイベントリスナーが "personal-task-create" を受け取って新規作成モードに移行
    };

    window.addEventListener("personal-memo-create", handlePersonalMemoCreate);
    window.addEventListener("personal-task-create", handlePersonalTaskCreate);

    return () => {
      window.removeEventListener(
        "personal-memo-create",
        handlePersonalMemoCreate,
      );
      window.removeEventListener(
        "personal-task-create",
        handlePersonalTaskCreate,
      );
    };
  }, [setCurrentMode, setScreenMode, setSelectedMemo, setSelectedTask]);

  return (
    <main className="relative h-full md:h-dvh w-full overflow-hidden">
      {/* エラー表示領域 */}
      <ErrorDisplay errors={errors} onClearErrors={clearErrors} />

      {/* 統一レイアウト（レスポンシブ対応） */}
      <MainClientDesktop
        preferences={preferences}
        handleSelectMemo={handleSelectMemo}
        handleSelectTask={handleSelectTask}
        handleEditTask={handleEditTask}
        handleShowList={wrappedHandleShowList}
        handleHome={wrappedHandleHome}
        handleEditMemo={handleEditMemo}
        handleDeleteMemo={handleDeleteMemo}
        selectedMemo={selectedMemo}
        selectedTask={selectedTask}
        currentMode={currentMode}
        setCurrentMode={setCurrentMode}
        handleSettings={wrappedHandleSettings}
        handleSearch={wrappedHandleSearch}
        handleDashboard={wrappedHandleDashboard}
        handleBoardDetail={wrappedHandleBoardDetail}
        handleTeamList={handleTeamList}
        handleTeamCreate={handleTeamCreate}
        screenMode={screenMode}
        initialBoardName={initialBoardName}
        currentBoard={currentBoard}
        showingBoardDetail={showingBoardDetail}
        boardSelectedItem={boardSelectedItem}
        handleBoardClearSelection={handleBoardClearSelection}
      >
        <MainContentArea
          screenMode={screenMode}
          pathname={pathname}
          currentMode={currentMode}
          selectedMemo={selectedMemo}
          selectedDeletedMemo={selectedDeletedMemo}
          selectedTask={selectedTask}
          selectedDeletedTask={selectedDeletedTask}
          boardSelectedItem={boardSelectedItem}
          setSelectedMemo={setSelectedMemo}
          setSelectedDeletedMemo={setSelectedDeletedMemo}
          setSelectedTask={setSelectedTask}
          setSelectedDeletedTask={setSelectedDeletedTask}
          setCurrentMode={setCurrentMode}
          boardId={boardId}
          boardFromSlug={boardFromSlug}
          initialBoardName={initialBoardName}
          serverBoardDescription={serverBoardDescription}
          serverBoardTitle={serverBoardTitle}
          showBoardHeader={showBoardHeader}
          showingBoardDetail={showingBoardDetail}
          boardScreenRef={boardScreenRef}
          handleSelectMemo={handleSelectMemo}
          handleSelectDeletedMemo={handleSelectDeletedMemo}
          handleSelectTask={handleSelectTask}
          handleSelectDeletedTask={handleSelectDeletedTask}
          handleClose={handleClose}
          handleShowList={handleShowList}
          handleBoardSelectMemo={handleBoardSelectMemo}
          handleBoardSelectTask={handleBoardSelectTask}
          handleBoardClearSelection={handleBoardClearSelection}
          teamMode={teamMode}
          teamId={teamId}
          handleTeamCreate={handleTeamCreate}
          handleTeamCreated={handleTeamCreated}
        />
      </MainClientDesktop>
    </main>
  );
}

export default MainClient;

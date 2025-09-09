"use client";

import { BoardScreenRef } from "@/components/screens/board-screen";
import { ErrorDisplay } from "@/components/ui/error-display";
import { MainClientMobile } from "./main-client-mobile";
import { MainClientDesktop } from "./main-client-desktop";
import { MainContentArea } from "./main-content-area";
import { useBoardBySlug, useBoardWithItems } from "@/src/hooks/use-boards";
import { useMainClientHandlers } from "@/src/hooks/use-main-client-handlers";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import type { DeletedTask, Task } from "@/src/types/task";
import { useNavigation } from "@/contexts/navigation-context";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState, useEffect } from "react";

interface MainClientProps {
  initialBoardName?: string;
  boardId?: number;
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

  // 現在のボードslug取得
  const currentBoardSlug = pathname.startsWith("/boards/")
    ? pathname.split("/")[2]
    : null;

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
  const [showTeamList, setShowTeamList] = useState(false); // チーム一覧表示フラグ
  const [showingBoardDetail, setShowingBoardDetail] = useState(() => {
    // サーバーサイドから明示的に指示されている場合は詳細表示
    // または、ボード情報が渡されている場合、URLがボード詳細の場合は詳細表示
    return (
      forceShowBoardDetail ||
      Boolean(boardId || initialBoardName || pathname.startsWith("/boards/"))
    );
  }); // ボード詳細表示フラグ

  // URLに基づいてscreenModeを設定（手動設定時は上書きしない）
  useLayoutEffect(() => {
    if (pathname.startsWith("/boards/")) {
      // 手動で設定された状態を上書きしない
      if (screenMode !== "board") {
        setScreenMode("board");
        setCurrentMode("board");
        setShowingBoardDetail(true); // ボード詳細URLでは詳細表示
      }
    } else if (pathname === "/") {
      // ルートページではボード一覧を表示
      if (isFromBoardDetail) {
        // ボード詳細から戻った場合はボード一覧を表示
        // isFromBoardDetailがtrueの場合は、すでにscreenModeがboardに設定されているはず
        // 上書きしない
        setIsFromBoardDetail(false); // フラグをリセット
      }
      // ルートページではボード一覧表示
      if (screenMode === "board") {
        setShowingBoardDetail(false);
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
      setScreenMode("home"); // チーム一覧もホーム画面の一部として扱う
    }
  };

  // 他のハンドラーをラップしてチーム表示をリセット
  const wrappedHandleHome = () => {
    setShowTeamList(false);
    handleHome();
  };

  const wrappedHandleShowList = (mode: "memo" | "task" | "board") => {
    setShowTeamList(false);
    handleShowList(mode);
  };

  const wrappedHandleDashboard = () => {
    setShowTeamList(false);
    handleDashboard();
  };

  const wrappedHandleSettings = () => {
    setShowTeamList(false);
    handleSettings();
  };

  const wrappedHandleSearch = () => {
    setShowTeamList(false);
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

  return (
    <main className="relative">
      {/* エラー表示領域 */}
      <ErrorDisplay errors={errors} onClearErrors={clearErrors} />

      {/* モバイル版レイアウト */}
      <MainClientMobile
        showDeleted={showDeleted}
        handleBackToMemos={handleBackToMemos}
        handleSelectDeletedMemo={handleSelectDeletedMemo}
        handleNewMemo={handleNewMemo}
        handleNewTask={handleNewTask}
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
        handleDashboard={wrappedHandleDashboard}
        handleBoardDetail={handleBoardDetail}
        handleNewBoard={handleNewBoard}
        handleTeamList={handleTeamList}
        screenMode={screenMode}
        initialBoardName={initialBoardName}
        currentBoard={currentBoard}
        showingBoardDetail={showingBoardDetail}
        showTeamList={showTeamList}
      />

      {/* デスクトップ版レイアウト */}
      <MainClientDesktop
        preferences={preferences}
        handleNewMemo={handleNewMemo}
        handleNewTask={handleNewTask}
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
        handleBoardDetail={handleBoardDetail}
        handleNewBoard={handleNewBoard}
        handleTeamList={handleTeamList}
        screenMode={screenMode}
        initialBoardName={initialBoardName}
        currentBoard={currentBoard}
        showingBoardDetail={showingBoardDetail}
        showTeamList={showTeamList}
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
          showTeamList={showTeamList}
        />
      </MainClientDesktop>
    </main>
  );
}

export default MainClient;

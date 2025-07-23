"use client";

import BoardDetailScreen from "@/components/screens/board-detail-screen";
import DeletedMemoList from "@/components/features/memo/deleted-memo-list";
import DesktopLayout from "@/components/layout/desktop-layout";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import BoardScreen, { BoardScreenRef } from "@/components/screens/board-screen";
import CreateScreen from "@/components/screens/create-screen";
import MemoScreen from "@/components/screens/memo-screen";
import SearchScreen from "@/components/screens/search-screen";
import SettingsScreen from "@/components/screens/settings-screen";
import TaskScreen from "@/components/screens/task-screen";
import WelcomeScreen from "@/components/screens/welcome-screen";
import { useBoardBySlug, useBoardWithItems } from "@/src/hooks/use-boards";
import { useUserPreferences } from "@/src/hooks/use-user-preferences";
import type { DeletedMemo, Memo } from "@/src/types/memo";
import type { DeletedTask, Task } from "@/src/types/task";
import { useNavigation } from "@/contexts/navigation-context";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useMemo, useCallback } from "react";

// 画面モード定義（7つのシンプルな画面状態）
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type ScreenMode =
  | "home"
  | "memo"
  | "task"
  | "create"
  | "search"
  | "settings"
  | "board";

interface MainClientProps {
  initialBoardName?: string;
  boardId?: number;
  showBoardHeader?: boolean;
  serverBoardTitle?: string;
  serverBoardDescription?: string | null;
  forceShowBoardDetail?: boolean;
}

function MainClient({ 
  initialBoardName, 
  boardId, 
  showBoardHeader = true, 
  serverBoardTitle, 
  serverBoardDescription,
  forceShowBoardDetail = false
}: MainClientProps) {
  // ==========================================
  // State管理
  // ==========================================

  // ユーザー設定取得
  const { preferences } = useUserPreferences(1);
  const pathname = usePathname();


  // コンテキストから状態を取得
  const { screenMode, currentMode, setScreenMode, setCurrentMode, isFromBoardDetail, setIsFromBoardDetail } = useNavigation();

  // refs
  const boardScreenRef = useRef<BoardScreenRef>(null);

  // 現在のボードslug取得
  const currentBoardSlug = pathname.startsWith("/boards/")
    ? pathname.split("/")[2]
    : null;

  // サーバーサイドでボード情報が取得済みの場合は不要なAPI呼び出しを回避
  const shouldFetchBoardFromSlug = !boardId && currentBoardSlug;
  const { data: boardFromSlug } = useBoardBySlug(
    shouldFetchBoardFromSlug ? currentBoardSlug : null
  );
  const { data: currentBoard } = useBoardWithItems(
    boardId || boardFromSlug?.id || null
  );

  // 選択中アイテム管理
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [selectedDeletedMemo, setSelectedDeletedMemo] =
    useState<DeletedMemo | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDeletedTask, setSelectedDeletedTask] =
    useState<DeletedTask | null>(null);

  // ボード詳細用の選択状態（Fast Refresh対応）
  const [boardSelectedItem, setBoardSelectedItem] = useState<{type: 'memo', item: Memo | DeletedMemo} | {type: 'task', item: Task | DeletedTask} | null>(null);

  // UI状態管理
  const [showDeleted, setShowDeleted] = useState(false); // モバイル版削除済み表示フラグ
  const [showingBoardDetail, setShowingBoardDetail] = useState(() => {
    // サーバーサイドから明示的に指示されている場合は詳細表示
    // または、ボード情報が渡されている場合、URLがボード詳細の場合は詳細表示
    return forceShowBoardDetail || Boolean(boardId || initialBoardName || pathname.startsWith("/boards/"));
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
  }, [pathname, isFromBoardDetail, setScreenMode, setCurrentMode, setIsFromBoardDetail]);


  // Hydration完了前はサーバーと同じ状態を保持
  // サイドバーが表示されない問題を避けるため、早期リターンを削除
  // if (!isHydrated) {
  //   return null; // またはローディングスピナーなど
  // }

  // エラー管理（将来的にAPI同期エラー表示用）
  const errors: string[] = [];
  const clearErrors = () => {};

  // ==========================================
  // 共通ユーティリティ関数
  // ==========================================

  /** 全選択状態をクリア */
  const clearAllSelections = () => {
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    
    // ボード詳細の選択状態もクリア
    setBoardSelectedItem(null);
  };

  // ==========================================
  // アイテム選択ハンドラー（デスクトップ・モバイル共通）
  // ==========================================

  /** メモ選択 - メモ画面に遷移 */
  const handleSelectMemo = (memo: Memo | null) => {
    if (memo) {
      setSelectedMemo(memo);
      setScreenMode("memo");
    } else {
      setSelectedMemo(null);
    }
  };

  /** 削除済みメモ選択 - メモ画面に遷移 */
  const handleSelectDeletedMemo = (memo: DeletedMemo | null) => {
    if (memo) {
      // clearAllSelections()の代わりに手動で他の状態をクリア
      setSelectedMemo(null);
      setSelectedTask(null);
      setSelectedDeletedTask(null);
      setShowDeleted(false);
      // 削除済みメモは最後に設定
      setSelectedDeletedMemo(memo);
      setScreenMode("memo");
    } else {
      setSelectedDeletedMemo(null);
    }
  };

  /** タスク選択 - タスク画面に遷移 */
  const handleSelectTask = (task: Task | null) => {
    setSelectedTask(task);
    if (task) {
      setScreenMode("task");
    }
  };

  /** 削除済みタスク選択 - タスク画面に遷移 */
  const handleSelectDeletedTask = (task: DeletedTask | null) => {
    if (task) {
      clearAllSelections();
      setSelectedDeletedTask(task);
      setScreenMode("task");
    } else {
      setSelectedDeletedTask(null);
    }
  };

  // ==========================================
  // 編集・削除ハンドラー（デスクトップ・モバイル共通）
  // ==========================================

  /** メモ編集 - メモ画面に遷移 */
  const handleEditMemo = (memo?: Memo) => {
    if (memo) {
      setSelectedMemo(memo);
    }
    setScreenMode("memo");
  };

  /** タスク編集 - タスク画面に遷移 */
  const handleEditTask = (task?: Task) => {
    if (task) {
      setSelectedTask(task);
    }
    setScreenMode("task");
  };

  /** メモ削除後の次メモ選択（モバイル版自動選択用） */
  const handleDeleteMemo = (nextMemo: Memo) => {
    clearAllSelections();
    setSelectedMemo(nextMemo);
    setScreenMode("memo");
  };

  // ==========================================
  // 画面遷移ハンドラー（デスクトップ・モバイル共通）
  // ==========================================

  /** ホーム画面に戻る */
  const handleHome = () => {
    clearAllSelections();
    setScreenMode("home");
  };

  /** 設定画面に遷移 */
  const handleSettings = () => {
    clearAllSelections();
    setScreenMode("settings");
  };

  /** 検索画面に遷移 */
  const handleSearch = () => {
    clearAllSelections();
    setScreenMode("search");
  };

  /** ボード画面に遷移 */
  const handleDashboard = () => {
    clearAllSelections();
    setScreenMode("board");
    setCurrentMode("board");
    setShowingBoardDetail(false); // ボード一覧を表示
  };

  /** ボード詳細に戻る */
  const handleBoardDetail = () => {
    clearAllSelections();
    setScreenMode("board");
    setCurrentMode("board");
    setShowingBoardDetail(true); // ボード詳細を表示
  };

  /** 新規作成画面に遷移 */
  const handleNewMemo = () => {
    clearAllSelections();
    setScreenMode("create");
  };

  const handleNewTask = () => {
    clearAllSelections();
    setScreenMode("create");
  };

  const handleNewBoard = () => {
    clearAllSelections();
    setCurrentMode("board");
    setScreenMode("create");
  };

  /** 詳細表示を閉じてホームに戻る */
  const handleClose = () => {
    clearAllSelections();
    setScreenMode("home");
  };

  /** 一覧表示に遷移（memo/task/board画面） */
  const handleShowList = (mode: "memo" | "task" | "board") => {
    clearAllSelections();
    setScreenMode(mode);
  };

  // ==========================================
  // ボード詳細専用ハンドラー
  // ==========================================

  /** ボード詳細でのメモ選択 */
  const handleBoardSelectMemo = useCallback((memo: Memo | null) => {
    if (!memo) {
      setBoardSelectedItem(null);
      return;
    }
    
    // 同じメモが既に選択されている場合は何もしない
    if (boardSelectedItem?.type === 'memo' && boardSelectedItem.item.id === memo.id) {
      return;
    }
    
    setBoardSelectedItem({type: 'memo', item: memo});
  }, [boardSelectedItem]);

  /** ボード詳細でのタスク選択 */
  const handleBoardSelectTask = useCallback((task: Task | DeletedTask | null) => {
    if (!task) {
      setBoardSelectedItem(null);
      return;
    }
    
    // 同じタスクが既に選択されている場合は何もしない
    if (boardSelectedItem?.type === 'task' && boardSelectedItem.item.id === task.id) {
      return;
    }
    
    setBoardSelectedItem({type: 'task', item: task});
  }, [boardSelectedItem]);

  /** ボード詳細での選択クリア */
  const handleBoardClearSelection = useCallback(() => {
    setBoardSelectedItem(null);
  }, []);

  // ==========================================
  // モバイル専用ハンドラー
  // ==========================================

  /** モバイル版：削除済み一覧から通常表示に戻る */
  const handleBackToMemos = () => {
    clearAllSelections();
    setScreenMode("home");
  };

  const router = useRouter();
  
  // BoardDetailWrapperコンポーネント（シンプル化）
  const BoardDetailWrapper = useMemo(() => {
    // サーバーサイドからのボード情報がある場合は優先使用
    const currentBoardId = boardId || boardFromSlug?.id;
    const currentBoardName = initialBoardName || boardFromSlug?.name;
    const currentBoardDescription = serverBoardDescription || boardFromSlug?.description;

    // ボードIDがない場合はエラー
    if (!currentBoardId) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              ボードが見つかりません
            </h1>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ボード一覧に戻る
            </button>
          </div>
        </div>
      );
    }

    // シンプルにBoardDetailを表示（メモ・タスク一覧と同じパターン）
    return (
      <BoardDetailScreen
        boardId={currentBoardId}
        onBack={() => router.push("/")}
        selectedMemo={boardSelectedItem?.type === 'memo' ? boardSelectedItem.item : null}
        selectedTask={boardSelectedItem?.type === 'task' ? boardSelectedItem.item : null}
        onSelectMemo={handleBoardSelectMemo}
        onSelectTask={handleBoardSelectTask}
        onClearSelection={handleBoardClearSelection}
        initialBoardName={currentBoardName}
        initialBoardDescription={currentBoardDescription}
        showBoardHeader={showBoardHeader}
        serverInitialTitle={serverBoardTitle}
      />
    );
  }, [
    boardId,
    boardFromSlug?.id,
    boardFromSlug?.name,
    boardFromSlug?.description,
    initialBoardName,
    serverBoardDescription,
    serverBoardTitle,
    showBoardHeader,
    boardSelectedItem,
    handleBoardSelectMemo,
    handleBoardSelectTask,
    handleBoardClearSelection,
    router,
  ]);

  return (
    <main className="relative">
      {/* ==========================================
          エラー表示領域（将来的なAPI同期エラー用）
          ========================================== */}
      {errors.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {errors.map((error, index) => (
            <div
              key={index}
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg max-w-sm"
            >
              <div className="flex justify-between items-start">
                <span className="text-sm">{error}</span>
                <button
                  onClick={clearErrors}
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          モバイル版レイアウト：サイドバー全画面表示
          ========================================== */}
      <div className="h-screen w-full md:hidden">
        {showDeleted ? (
          // 削除済みメモ一覧表示
          <DeletedMemoList
            onBackToMemos={handleBackToMemos}
            onSelectDeletedMemo={handleSelectDeletedMemo}
          />
        ) : (
          // 通常のサイドバー表示（フルサイズ）
          <Sidebar
            onNewMemo={handleNewMemo}
            onNewTask={handleNewTask}
            onSelectMemo={handleSelectMemo}
            onSelectTask={handleSelectTask}
            onEditTask={handleEditTask}
            onShowFullList={() => handleShowList("memo")}
            onHome={handleHome}
            onEditMemo={handleEditMemo}
            onDeleteMemo={handleDeleteMemo}
            selectedMemoId={selectedMemo?.id}
            selectedTaskId={selectedTask?.id}
            isCompact={false} // モバイルは常にフルサイズ
            currentMode={currentMode}
            onModeChange={setCurrentMode}
            onSettings={handleSettings}
            onDashboard={handleDashboard}
            onBoardDetail={handleBoardDetail}
            onNewBoard={handleNewBoard}
            isBoardActive={
              screenMode === "board" ||
              (screenMode === "create" && currentMode === "board")
            }
            currentBoardName={initialBoardName || currentBoard?.name}
            showingBoardDetail={showingBoardDetail}
          />
        )}
      </div>

      {/* ==========================================
          デスクトップ版レイアウト：ヘッダー + サイドバー + メインコンテンツ
          ========================================== */}
      <div className="hidden md:flex flex-col h-screen w-full">
        {/* ヘッダー（設定で非表示可能） */}
        {!preferences?.hideHeader && <Header />}

        {/* メインレイアウト */}
        <DesktopLayout
          hideHeader={preferences?.hideHeader}
          sidebarContent={
            // コンパクトサイドバー（アイコンナビ）
            <Sidebar
              onNewMemo={handleNewMemo}
              onNewTask={handleNewTask}
              onSelectMemo={handleSelectMemo}
              onSelectTask={handleSelectTask}
              onEditTask={handleEditTask}
              onShowFullList={() => handleShowList("memo")}
              onShowTaskList={() => handleShowList("task")}
              onHome={handleHome}
              onEditMemo={handleEditMemo}
              onDeleteMemo={handleDeleteMemo}
              selectedMemoId={selectedMemo?.id}
              selectedTaskId={selectedTask?.id}
              isCompact={true} // デスクトップは常にコンパクト
              currentMode={currentMode}
              onModeChange={setCurrentMode}
              onSettings={handleSettings}
              onSearch={handleSearch}
              onDashboard={handleDashboard}
              onBoardDetail={handleBoardDetail}
              onNewBoard={handleNewBoard}
              isBoardActive={
                screenMode === "board" ||
                (screenMode === "create" && currentMode === "board")
              }
              currentBoardName={initialBoardName || currentBoard?.name}
              showingBoardDetail={showingBoardDetail}
            />
          }
        >
          {/* ==========================================
              メインコンテンツエリア（7つの画面モード）
              ========================================== */}

          {/* ホーム画面 */}
          {screenMode === "home" && <WelcomeScreen />}

          {/* メモ関連画面（一覧・表示・編集） */}
          {screenMode === "memo" && (
            <MemoScreen
              selectedMemo={selectedMemo}
              selectedDeletedMemo={selectedDeletedMemo}
              onSelectMemo={handleSelectMemo}
              onSelectDeletedMemo={handleSelectDeletedMemo}
              onClose={handleClose}
              onDeselectAndStayOnMemoList={() => {
                setSelectedMemo(null);
                setSelectedDeletedMemo(null);
              }}
            />
          )}

          {/* タスク関連画面（一覧・表示・編集） */}
          {screenMode === "task" && (
            <TaskScreen
              selectedTask={selectedTask}
              selectedDeletedTask={selectedDeletedTask}
              onSelectTask={handleSelectTask}
              onSelectDeletedTask={handleSelectDeletedTask}
              onClose={handleClose}
              onClearSelection={() => {
                setSelectedTask(null);
                setSelectedDeletedTask(null);
              }}
            />
          )}

          {/* 新規作成画面（メモ・タスク・ボード統合） */}
          {screenMode === "create" && (
            <CreateScreen
              initialMode={currentMode}
              onClose={handleClose}
              onModeChange={setCurrentMode}
              onShowMemoList={() => handleShowList("memo")}
              onShowTaskList={() => handleShowList("task")}
              onShowBoardList={() => handleShowList("board")}
            />
          )}

          {/* 検索画面 */}
          {screenMode === "search" && (
            <SearchScreen
              onSelectMemo={handleSelectMemo}
              onSelectTask={handleSelectTask}
              onSelectDeletedMemo={handleSelectDeletedMemo}
              onSelectDeletedTask={handleSelectDeletedTask}
            />
          )}

          {/* 設定画面 */}
          {screenMode === "settings" && <SettingsScreen />}

          {/* ボード画面 */}
          {screenMode === "board" &&
            ((pathname.startsWith("/boards/") || boardId || initialBoardName) ? (
              showingBoardDetail ? BoardDetailWrapper : (
                <BoardScreen 
                  ref={boardScreenRef}
                />
              )
            ) : (
              <BoardScreen 
                ref={boardScreenRef}
              />
            ))}
        </DesktopLayout>
      </div>
    </main>
  );
}

export default MainClient;

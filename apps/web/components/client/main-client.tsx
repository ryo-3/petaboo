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
import { useTabState } from "@/src/contexts/tab-state-context";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState, useEffect } from "react";
import BoardSettings from "@/components/features/board/board-settings";
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
  showBoardSettings?: boolean;
  initialBoardCompleted?: boolean;
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
  showBoardSettings = false,
  initialBoardCompleted = false,
}: MainClientProps) {
  // ==========================================
  // State管理
  // ==========================================

  // ユーザー設定取得
  const { preferences } = useUserPreferences(1);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // ボード設定画面の表示状態（propsまたはURLパラメータから初期化）
  const [isShowingBoardSettings, setIsShowingBoardSettings] = useState(
    showBoardSettings || searchParams.get("settings") === "true",
  );

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

  // タブ状態管理（画面遷移時にリセット用）
  const { resetTaskListTab, resetMemoListTab } = useTabState();

  // refs
  const boardScreenRef = useRef<BoardScreenRef>(null);

  // URLクエリパラメータからボードslugを取得
  // 新形式: ?board=SLUG、旧形式との互換性: ?SLUG
  const getBoardSlugFromParams = (): string | null => {
    // 新形式: ?board=SLUG
    const boardParam = searchParams.get("board");
    if (boardParam) return boardParam.toUpperCase();

    // 旧形式との互換性: ?SLUG形式（値が空のキー）
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

  // クエリパラメータからボードslugを取得
  const boardSlugFromParams = getBoardSlugFromParams();

  // URLパラメータからメモ/タスクIDを取得
  const memoIdFromParams = searchParams.get("memo");
  const taskIdFromParams = searchParams.get("task");

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

  // 最後に開いたボードを記憶（サイドバーのボード詳細アイコン用）
  const [lastBoardSlug, setLastBoardSlug] = useState<string | undefined>(
    undefined,
  );
  const [lastBoardName, setLastBoardName] = useState<string | undefined>(
    undefined,
  );
  const [lastBoardId, setLastBoardId] = useState<number | undefined>(undefined);

  // NavigationContextから統一された状態を取得
  const {
    showTeamList,
    setShowTeamList,
    showTeamCreate,
    setShowTeamCreate,
    showingBoardDetail,
    setShowingBoardDetail,
  } = useNavigation();

  // 現在のボードslug取得
  // 優先順位: 1. クエリパラメータ（?SLUG形式）, 2. props経由, 3. URL直接指定, 4. 最後に開いたボード（state優先）
  const currentBoardSlug =
    boardSlugFromParams ||
    boardSlug ||
    (pathname.startsWith("/boards/") ? pathname.split("/")[2] : null) ||
    (showingBoardDetail ? lastBoardSlug : null);

  // サーバーサイドでボード情報が取得済みの場合は不要なAPI呼び出しを回避
  const shouldFetchBoardFromSlug = !boardId && currentBoardSlug;
  const { data: boardFromSlug } = useBoardBySlug(
    shouldFetchBoardFromSlug ? currentBoardSlug : null,
  );
  const { data: currentBoard } = useBoardWithItems(
    boardId || boardFromSlug?.id || null,
  );

  // 初期値設定（一度だけ実行、ユーザーの手動切り替えは除外）
  const hasUserManuallyChanged = useRef(false);

  useEffect(() => {
    // ユーザーが手動で切り替えた場合（サイドバークリックなど）は
    // useEffectでの状態変更をスキップ（state優先）
    if (hasUserManuallyChanged.current) return;

    // クエリパラメータでボードslugが指定された場合は常にボード詳細を表示
    // これはURLナビゲーション（直接アクセス・ブックマーク）の場合のみ
    if (boardSlugFromParams) {
      if (!showingBoardDetail) {
        setShowingBoardDetail(true);
      }
      return;
    }

    // クエリパラメータがなくなった場合（ボード一覧に戻った場合）
    // ボード詳細から戻るときは showingBoardDetail を false に
    // ※ユーザー手動切り替えでない場合のみ（上でチェック済み）
    if (
      !boardSlugFromParams &&
      !boardSlug &&
      !pathname.startsWith("/boards/") &&
      showingBoardDetail
    ) {
      setShowingBoardDetail(false);
      return;
    }

    // サーバーサイドから明示的に指示されている場合は詳細表示
    // または、ボード情報が渡されている場合、URLがボード詳細の場合は詳細表示
    // boardSlug: props経由のボード指定
    const initialShowingBoardDetail =
      forceShowBoardDetail ||
      Boolean(
        boardId ||
          initialBoardName ||
          boardSlug ||
          pathname.startsWith("/boards/"),
      );

    if (initialShowingBoardDetail && !showingBoardDetail) {
      setShowingBoardDetail(true);
    }
  }, [
    forceShowBoardDetail,
    boardId,
    initialBoardName,
    boardSlug,
    boardSlugFromParams,
    pathname,
    showingBoardDetail,
    setShowingBoardDetail,
  ]); // ボード詳細表示フラグ

  // ボード詳細表示時に lastBoardSlug / lastBoardName / lastBoardId を記憶
  // かつ、ヘッダーにボード名を通知（個人ボード詳細でもヘッダーが正しく表示されるように）
  useEffect(() => {
    const slug = boardSlugFromParams || currentBoardSlug;
    const name = initialBoardName || currentBoard?.name;
    const id = boardId || boardFromSlug?.id || currentBoard?.id;
    if (slug) {
      setLastBoardSlug(slug);
    }
    if (name) {
      setLastBoardName(name);
    }
    if (id) {
      setLastBoardId(id);
    }

    // 個人ボード詳細ページの場合、ヘッダーにボード名を通知
    // チーム側と同じイベントを使用することで、ヘッダーの表示ロジックを統一
    if (showingBoardDetail && name && !teamMode) {
      window.dispatchEvent(
        new CustomEvent("team-board-name-change", {
          detail: {
            boardName: name,
            boardDescription: currentBoard?.description || "",
            boardSlug: currentBoard?.slug || currentBoardSlug,
          },
        }),
      );
    }
  }, [
    boardSlugFromParams,
    currentBoardSlug,
    initialBoardName,
    currentBoard?.name,
    currentBoard?.description,
    currentBoard?.slug,
    boardId,
    boardFromSlug?.id,
    currentBoard?.id,
    showingBoardDetail,
    teamMode,
  ]);

  // URLパラメータからscreenModeを設定（詳細の復元はMemoScreen/TaskScreenに委譲）
  const hasSetScreenModeFromUrl = useRef(false);
  useEffect(() => {
    // 既に設定済み、またはユーザーが手動で切り替えた場合はスキップ
    if (hasSetScreenModeFromUrl.current || hasUserManuallyChanged.current)
      return;

    // ボード詳細ページでは設定しない（ボード内の選択は別処理）
    if (boardSlugFromParams) return;

    // メモIDがURLにある場合 → メモ画面を表示（詳細選択はMemoScreenで行う）
    if (memoIdFromParams && !selectedMemo && !selectedDeletedMemo) {
      setScreenMode("memo");
      hasSetScreenModeFromUrl.current = true;
    }

    // タスクIDがURLにある場合 → タスク画面を表示（詳細選択はTaskScreenで行う）
    if (taskIdFromParams && !selectedTask && !selectedDeletedTask) {
      setScreenMode("task");
      hasSetScreenModeFromUrl.current = true;
    }
  }, [
    memoIdFromParams,
    taskIdFromParams,
    selectedMemo,
    selectedDeletedMemo,
    selectedTask,
    selectedDeletedTask,
    boardSlugFromParams,
    setScreenMode,
  ]);

  // URLに基づいてscreenModeを設定（手動設定時は上書きしない）
  useLayoutEffect(() => {
    // ボード詳細: URL直接指定またはクエリパラメータ形式（?SLUG）
    const isBoardDetailPage =
      pathname.startsWith("/boards/") ||
      pathname.includes("/board/") ||
      boardSlugFromParams ||
      boardSlug;

    if (isBoardDetailPage) {
      // ボード詳細URLでは基本的にボードモードに設定
      // ただし、ユーザーがメモ/タスク画面を開いている場合は上書きしない
      if (
        screenMode !== "memo" &&
        screenMode !== "task" &&
        screenMode !== "create"
      ) {
        setScreenMode("board");
        setCurrentMode("board");
      }
      // チームボード詳細の場合は詳細表示フラグも設定
      if (pathname.includes("/board/")) {
        setShowingBoardDetail(true);
      }
      // showingBoardDetailは初回のみ設定（ユーザーの手動切り替えを尊重）
    } else if (pathname === "/") {
      // ボード削除成功後のフラグをチェック
      const boardDeleted = sessionStorage.getItem("boardDeleted");
      if (boardDeleted === "true") {
        sessionStorage.removeItem("boardDeleted");
        // ボード一覧のキャッシュを完全削除して最新データを取得
        ["normal", "completed", "deleted"].forEach((status) => {
          queryClient.removeQueries({
            queryKey: ["boards", status],
          });
        });
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
        // ルートページではホーム画面を表示（初回のみ）
        // screenModeをチェックしないことで、ユーザーが手動で切り替えた場合は維持される
        if (isFromBoardDetail) {
          // ボード詳細から戻った場合のみhomeに戻す
          setScreenMode("home");
          setIsFromBoardDetail(false); // フラグをリセット
        }
      }
    }
    // ルートパス("/")でもユーザーが手動で切り替えた場合はホームに戻さない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    pathname,
    boardSlug,
    boardSlugFromParams,
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
      // URLを更新（個人側のみ）
      if (!teamMode) {
        router.replace("/", { scroll: false });
      }
    } else {
      // チーム一覧を開く場合は、他のモードをリセット
      setShowTeamList(true);
      setShowTeamCreate(false);
      setScreenMode("team"); // チーム一覧表示時はteamモードに設定
      // URLを更新（個人側のみ）
      if (!teamMode) {
        router.replace("/?team-list", { scroll: false });
      }
    }
  };

  // チーム作成ハンドラー
  const handleTeamCreate = () => {
    setShowTeamCreate(true);
    setShowTeamList(false);
    setScreenMode("team");
    // URLを更新（個人側のみ）
    if (!teamMode) {
      router.replace("/?team-create", { scroll: false });
    }
  };

  // チーム作成完了ハンドラー
  const handleTeamCreated = () => {
    setShowTeamCreate(false);
    setShowTeamList(true);
    setScreenMode("team");
  };

  // ボード設定画面を開く（リロードなし）
  const openBoardSettings = () => {
    setIsShowingBoardSettings(true);
    // URLに?settings=trueを追加（リロードなし）
    const newUrl = `${pathname}?settings=true`;
    window.history.replaceState(null, "", newUrl);
  };

  // ボード設定画面を閉じてURLからsettingsパラメータを消す
  const closeBoardSettings = () => {
    setIsShowingBoardSettings(false);
    if (searchParams.get("settings") === "true") {
      // URLからsettingsパラメータを消す
      const newUrl = pathname;
      window.history.replaceState(null, "", newUrl);
    }
  };

  // 他のハンドラーをラップしてチーム表示をリセット
  const wrappedHandleHome = () => {
    closeBoardSettings();
    handleHome();
  };

  const wrappedHandleShowList = (mode: "memo" | "task" | "board") => {
    closeBoardSettings();
    setShowTeamList(false);
    setShowTeamCreate(false);
    hasUserManuallyChanged.current = true; // ユーザーが手動で切り替えたことを記録
    // メモ/タスク一覧に遷移する場合はボード詳細を閉じる
    if (mode === "memo" || mode === "task") {
      setShowingBoardDetail(false);
    }
    // 画面遷移時にタブをリセット（PETABOO-87対応）
    if (mode === "task") {
      resetTaskListTab();
    } else if (mode === "memo") {
      resetMemoListTab();
    }
    handleShowList(mode);
  };

  const wrappedHandleDashboard = () => {
    closeBoardSettings();
    setShowTeamList(false);
    setShowTeamCreate(false);
    hasUserManuallyChanged.current = true; // ユーザーが手動で切り替えたことを記録
    setShowingBoardDetail(false); // ボード一覧を表示
    handleDashboard();
  };

  const wrappedHandleBoardDetail = () => {
    closeBoardSettings();
    setShowTeamList(false);
    setShowTeamCreate(false);
    hasUserManuallyChanged.current = true; // ユーザーが手動で切り替えたことを記録

    // 🚀 画面遷移を先に行う（閉じるアニメーションを見せない）
    // showingBoardDetailのみ設定（screenModeは変更しない）
    // main-content-area.tsxでshowingBoardDetailを優先チェックするため、
    // screenModeが何であってもボード詳細が表示される
    setShowingBoardDetail(true);
    setCurrentMode("board");
    // ヘッダーを即座に更新（ボード名がある場合）
    if (lastBoardName) {
      window.dispatchEvent(
        new CustomEvent("team-board-name-change", {
          detail: {
            boardName: lastBoardName,
            boardDescription: "",
            boardSlug: lastBoardSlug,
          },
        }),
      );
    }
    // lastBoardSlugがある場合はそのボード詳細URLに遷移
    if (lastBoardSlug) {
      router.replace(`/?board=${lastBoardSlug}`, { scroll: false });
    }

    // 🚀 選択状態のクリアは次のフレームで実行（画面遷移後）
    requestAnimationFrame(() => {
      setSelectedMemo(null);
      setSelectedDeletedMemo(null);
      setSelectedTask(null);
      setSelectedDeletedTask(null);
      setBoardSelectedItem(null);
    });
  };

  const wrappedHandleSettings = () => {
    closeBoardSettings();
    setShowTeamList(false);
    setShowTeamCreate(false);
    handleSettings();
  };

  const wrappedHandleSearch = () => {
    closeBoardSettings();
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
    teamMode,
    currentBoardSlug,
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
        lastBoardSlug={lastBoardSlug}
        lastBoardName={lastBoardName}
      >
        {isShowingBoardSettings && (boardId || boardFromSlug?.id) ? (
          <div className="h-full pt-6 pl-6 pr-6 flex flex-col overflow-y-auto">
            <BoardSettings
              boardId={boardId || boardFromSlug?.id || 0}
              boardSlug={currentBoardSlug || boardFromSlug?.slug || ""}
              initialBoardName={initialBoardName || boardFromSlug?.name || ""}
              initialBoardDescription={
                serverBoardDescription || boardFromSlug?.description
              }
              initialBoardCompleted={
                initialBoardCompleted || boardFromSlug?.completed || false
              }
              onBack={closeBoardSettings}
            />
          </div>
        ) : (
          <MainContentArea
            screenMode={screenMode}
            pathname={pathname}
            currentMode={currentMode}
            // ボード詳細ページではURL復元しない（ボード内の選択は別処理）
            initialMemoId={boardSlugFromParams ? null : memoIdFromParams}
            initialTaskId={boardSlugFromParams ? null : taskIdFromParams}
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
            boardId={
              boardId ||
              boardFromSlug?.id ||
              (showingBoardDetail ? lastBoardId : undefined)
            }
            boardFromSlug={boardFromSlug}
            lastBoardSlug={lastBoardSlug}
            initialBoardName={
              initialBoardName || boardFromSlug?.name || lastBoardName
            }
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
            onBoardSettings={openBoardSettings}
          />
        )}
      </MainClientDesktop>
    </main>
  );
}

export default MainClient;

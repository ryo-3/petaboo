import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNavigation } from "@/src/contexts/navigation-context";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";

interface UseMainClientHandlersProps {
  setSelectedMemo: (memo: Memo | null) => void;
  setSelectedDeletedMemo: (memo: DeletedMemo | null) => void;
  setSelectedTask: (task: Task | null) => void;
  setSelectedDeletedTask: (task: DeletedTask | null) => void;
  setShowDeleted: (show: boolean) => void;
  setBoardSelectedItem: (
    item:
      | { type: "memo"; item: Memo | DeletedMemo }
      | { type: "task"; item: Task | DeletedTask }
      | null,
  ) => void;
  setShowingBoardDetail: (show: boolean) => void;
  boardSelectedItem:
    | { type: "memo"; item: Memo | DeletedMemo }
    | { type: "task"; item: Task | DeletedTask }
    | null;
}

export function useMainClientHandlers({
  setSelectedMemo,
  setSelectedDeletedMemo,
  setSelectedTask,
  setSelectedDeletedTask,
  setShowDeleted,
  setBoardSelectedItem,
  setShowingBoardDetail,
  boardSelectedItem,
}: UseMainClientHandlersProps) {
  const router = useRouter();
  const { setScreenMode, setCurrentMode } = useNavigation();

  // ==========================================
  // 共通ユーティリティ関数
  // ==========================================

  /** 全選択状態をクリア */
  const clearAllSelections = useCallback(() => {
    setSelectedMemo(null);
    setSelectedDeletedMemo(null);
    setSelectedTask(null);
    setSelectedDeletedTask(null);
    setShowDeleted(false);
    setBoardSelectedItem(null);
  }, [
    setSelectedMemo,
    setSelectedDeletedMemo,
    setSelectedTask,
    setSelectedDeletedTask,
    setShowDeleted,
    setBoardSelectedItem,
  ]);

  /** 選択されたアイテムまでスクロール */
  const scrollToSelectedItem = useCallback(
    (itemId: number, itemType: "memo" | "task") => {
      // 少し遅延させてDOM更新を待つ
      setTimeout(() => {
        const selector =
          itemType === "memo"
            ? `[data-memo-id="${itemId}"]`
            : `[data-task-id="${itemId}"]`;
        const element = document.querySelector(selector);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });
        }
      }, 100);
    },
    [],
  );

  // ==========================================
  // アイテム選択ハンドラー（デスクトップ・モバイル共通）
  // ==========================================

  /** メモ選択 - メモ画面に遷移 */
  const handleSelectMemo = useCallback(
    (memo: Memo | null) => {
      if (memo) {
        setSelectedMemo(memo);
        setScreenMode("memo");
        // 選択されたメモまでスクロール
        scrollToSelectedItem(memo.id, "memo");
      } else {
        setSelectedMemo(null);
      }
    },
    [setSelectedMemo, setScreenMode, scrollToSelectedItem],
  );

  /** 削除済みメモ選択 - メモ画面に遷移 */
  const handleSelectDeletedMemo = useCallback(
    (memo: DeletedMemo | null) => {
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
    },
    [
      setSelectedMemo,
      setSelectedTask,
      setSelectedDeletedTask,
      setShowDeleted,
      setSelectedDeletedMemo,
      setScreenMode,
    ],
  );

  /** タスク選択 - タスク画面に遷移 */
  const handleSelectTask = useCallback(
    (task: Task | null) => {
      setSelectedTask(task);
      if (task) {
        setScreenMode("task");
        // 選択されたタスクまでスクロール
        scrollToSelectedItem(task.id, "task");
      }
    },
    [setSelectedTask, setScreenMode, scrollToSelectedItem],
  );

  /** 削除済みタスク選択 - タスク画面に遷移 */
  const handleSelectDeletedTask = useCallback(
    (task: DeletedTask | null) => {
      if (task) {
        clearAllSelections();
        setSelectedDeletedTask(task);
        setScreenMode("task");
      } else {
        setSelectedDeletedTask(null);
      }
    },
    [clearAllSelections, setSelectedDeletedTask, setScreenMode],
  );

  // ==========================================
  // 編集・削除ハンドラー（デスクトップ・モバイル共通）
  // ==========================================

  /** メモ編集 - メモ画面に遷移 */
  const handleEditMemo = useCallback(
    (memo?: Memo) => {
      if (memo) {
        setSelectedMemo(memo);
      }
      setScreenMode("memo");
    },
    [setSelectedMemo, setScreenMode],
  );

  /** タスク編集 - タスク画面に遷移 */
  const handleEditTask = useCallback(
    (task?: Task) => {
      if (task) {
        setSelectedTask(task);
      }
      setScreenMode("task");
    },
    [setSelectedTask, setScreenMode],
  );

  /** メモ削除後の次メモ選択（モバイル版自動選択用） */
  const handleDeleteMemo = useCallback(
    (nextMemo: Memo) => {
      clearAllSelections();
      setSelectedMemo(nextMemo);
      setScreenMode("memo");
    },
    [clearAllSelections, setSelectedMemo, setScreenMode],
  );

  // ==========================================
  // 画面遷移ハンドラー（デスクトップ・モバイル共通）
  // ==========================================

  /** ホーム画面に戻る */
  const handleHome = useCallback(() => {
    clearAllSelections();
    setScreenMode("home");
    setCurrentMode("memo"); // currentModeをデフォルトに戻す
  }, [clearAllSelections, setScreenMode, setCurrentMode]);

  /** 設定画面に遷移 */
  const handleSettings = useCallback(() => {
    clearAllSelections();
    setScreenMode("settings");
  }, [clearAllSelections, setScreenMode]);

  /** 検索画面に遷移 */
  const handleSearch = useCallback(() => {
    clearAllSelections();
    setScreenMode("search");
  }, [clearAllSelections, setScreenMode]);

  /** ボード画面に遷移 */
  const handleDashboard = useCallback(() => {
    clearAllSelections();
    setScreenMode("board");
    setCurrentMode("board");
    setShowingBoardDetail(false);
  }, [
    clearAllSelections,
    setScreenMode,
    setCurrentMode,
    setShowingBoardDetail,
  ]);

  /** ボード詳細に戻る */
  const handleBoardDetail = useCallback(() => {
    clearAllSelections();
    setScreenMode("board");
    setCurrentMode("board");
    setShowingBoardDetail(true);
  }, [
    clearAllSelections,
    setScreenMode,
    setCurrentMode,
    setShowingBoardDetail,
  ]);

  /** 新規作成画面に遷移 */
  const handleNewMemo = useCallback(() => {
    clearAllSelections();
    setScreenMode("create");
  }, [clearAllSelections, setScreenMode]);

  const handleNewTask = useCallback(() => {
    clearAllSelections();
    setScreenMode("create");
  }, [clearAllSelections, setScreenMode]);

  const handleNewBoard = useCallback(() => {
    clearAllSelections();
    setCurrentMode("board");
    setScreenMode("create");
  }, [clearAllSelections, setCurrentMode, setScreenMode]);

  /** 詳細表示を閉じてホームに戻る */
  const handleClose = useCallback(() => {
    clearAllSelections();
    setScreenMode("home");
  }, [clearAllSelections, setScreenMode]);

  /** 一覧表示に遷移（memo/task/board画面） */
  const handleShowList = useCallback(
    (mode: "memo" | "task" | "board") => {
      clearAllSelections();
      setScreenMode(mode);
    },
    [clearAllSelections, setScreenMode],
  );

  // ==========================================
  // ボード詳細専用ハンドラー
  // ==========================================

  /** ボード詳細でのメモ選択 */
  const handleBoardSelectMemo = useCallback(
    (memo: Memo | DeletedMemo | null) => {
      if (!memo) {
        setBoardSelectedItem(null);
        return;
      }

      // 同じメモIDかつ同じ削除状態（通常/削除済み）が既に選択されている場合は何もしない
      const isCurrentlySelectedSameMemo =
        boardSelectedItem?.type === "memo" &&
        boardSelectedItem.item.id === memo.id &&
        "deletedAt" in boardSelectedItem.item === "deletedAt" in memo;

      if (isCurrentlySelectedSameMemo) {
        return;
      }

      setBoardSelectedItem({ type: "memo", item: memo });
    },
    [boardSelectedItem, setBoardSelectedItem],
  );

  /** ボード詳細でのタスク選択 */
  const handleBoardSelectTask = useCallback(
    (task: Task | DeletedTask | null) => {
      if (!task) {
        setBoardSelectedItem(null);
        return;
      }

      // 同じタスクが既に選択されている場合は何もしない
      if (
        boardSelectedItem?.type === "task" &&
        boardSelectedItem.item.id === task.id
      ) {
        return;
      }

      setBoardSelectedItem({ type: "task", item: task });
    },
    [boardSelectedItem, setBoardSelectedItem],
  );

  /** ボード詳細での選択クリア */
  const handleBoardClearSelection = useCallback(() => {
    setBoardSelectedItem(null);
  }, [setBoardSelectedItem]);

  // ==========================================
  // モバイル専用ハンドラー
  // ==========================================

  /** モバイル版：削除済み一覧から通常表示に戻る */
  const handleBackToMemos = useCallback(() => {
    clearAllSelections();
    setScreenMode("home");
  }, [clearAllSelections, setScreenMode]);

  return {
    // アイテム選択
    handleSelectMemo,
    handleSelectDeletedMemo,
    handleSelectTask,
    handleSelectDeletedTask,

    // 編集・削除
    handleEditMemo,
    handleEditTask,
    handleDeleteMemo,

    // 画面遷移
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

    // ボード詳細
    handleBoardSelectMemo,
    handleBoardSelectTask,
    handleBoardClearSelection,

    // モバイル
    handleBackToMemos,

    // ルーター（コンポーネント内で必要）
    router,
  };
}

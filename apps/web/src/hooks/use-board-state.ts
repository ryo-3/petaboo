import { useCallback, useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";

export function useBoardState() {
  const router = useRouter();
  const pathname = usePathname();

  // タブ状態
  const [activeTaskTab, setActiveTaskTab] = useState<
    "todo" | "in_progress" | "completed" | "deleted"
  >("todo");
  const [activeMemoTab, setActiveMemoTab] = useState<"normal" | "deleted">(
    "normal",
  );
  const [showTabText, setShowTabText] = useState(true);

  // パネル状態
  const [rightPanelMode, setRightPanelMode] = useState<
    "editor" | "memo-list" | "task-list" | null
  >(null);
  const [selectedItemsFromList, setSelectedItemsFromList] = useState<
    Set<number>
  >(new Set());

  const [columnCount, setColumnCount] = useState(2);

  // ボードレイアウト状態
  const [boardLayout, setBoardLayout] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const [isReversed, setIsReversed] = useState(false);

  // コンテンツフィルター状態（非選択時用）
  const [showMemo, setShowMemo] = useState(true);
  const [showTask, setShowTask] = useState(true);
  const [showComment, setShowComment] = useState(true);

  // 選択時のパネル表示状態
  const [showListPanel, setShowListPanel] = useState(true); // 一覧パネル
  const [showDetailPanel, setShowDetailPanel] = useState(true); // 詳細パネル
  const [showCommentPanel, setShowCommentPanel] = useState(true); // コメントパネル

  // 最新値を保持するref
  const rightPanelModeRef = useRef(rightPanelMode);
  rightPanelModeRef.current = rightPanelMode;
  const activeTaskTabRef = useRef(activeTaskTab);
  activeTaskTabRef.current = activeTaskTab;

  // リストパネル表示時に選択状態をリセット
  useEffect(() => {
    if (rightPanelMode === "memo-list" || rightPanelMode === "task-list") {
      setSelectedItemsFromList(new Set());
    }
  }, [rightPanelMode]);

  // ボードレイアウト変更ハンドラー（反転機能付き）
  const handleBoardLayoutChange = useCallback(
    (newLayout: "horizontal" | "vertical") => {
      if (boardLayout === newLayout) {
        // 同じレイアウトをクリックした場合は反転
        setIsReversed((prev) => !prev);
      } else {
        // 異なるレイアウトの場合は変更して反転状態をリセット
        setBoardLayout(newLayout);
        setIsReversed(false);
      }
    },
    [boardLayout],
  );

  // 設定画面への遷移
  const handleSettings = useCallback(() => {
    const boardSlug = pathname.split("/")[2];
    router.push(`/boards/${boardSlug}/settings`);
  }, [pathname, router]); // 依存配列に追加

  // メモボタンのハンドラー
  const handleMemoToggle = useCallback(
    (show: boolean) => {
      // 非表示にしようとした時、他の2つも非表示なら拒否
      if (!show && !showTask && !showComment) {
        return; // 最低1つは表示する必要がある
      }
      setShowMemo(show);
    },
    [showTask, showComment],
  );

  // タスクボタンのハンドラー
  const handleTaskToggle = useCallback(
    (show: boolean) => {
      // 非表示にしようとした時、他の2つも非表示なら拒否
      if (!show && !showMemo && !showComment) {
        return; // 最低1つは表示する必要がある
      }
      setShowTask(show);
    },
    [showMemo, showComment],
  );

  // コメントボタンのハンドラー（非選択時）
  const handleCommentToggle = useCallback(
    (show: boolean) => {
      // 非表示にしようとした時、他の2つも非表示なら拒否
      if (!show && !showMemo && !showTask) {
        return; // 最低1つは表示する必要がある
      }
      setShowComment(show);
    },
    [showMemo, showTask],
  );

  // 選択時のパネルトグルハンドラー
  const handleListPanelToggle = useCallback(
    (show: boolean) => {
      // 非表示にしようとした時、他の2つも非表示なら拒否
      if (!show && !showDetailPanel && !showCommentPanel) {
        return; // 最低1つは表示する必要がある
      }
      setShowListPanel(show);
    },
    [showDetailPanel, showCommentPanel],
  );

  const handleDetailPanelToggle = useCallback(
    (show: boolean) => {
      // 非表示にしようとした時、他の2つも非表示なら拒否
      if (!show && !showListPanel && !showCommentPanel) {
        return; // 最低1つは表示する必要がある
      }
      setShowDetailPanel(show);
    },
    [showListPanel, showCommentPanel],
  );

  const handleCommentPanelToggle = useCallback(
    (show: boolean) => {
      // 非表示にしようとした時、他の2つも非表示なら拒否
      if (!show && !showListPanel && !showDetailPanel) {
        return; // 最低1つは表示する必要がある
      }
      setShowCommentPanel(show);
    },
    [showListPanel, showDetailPanel],
  );

  // タスクタブ切り替え時の処理
  const handleTaskTabChange = useCallback(
    (newTab: "todo" | "in_progress" | "completed" | "deleted") => {
      setActiveTaskTab(newTab);
      // 選択解除は行わない（タブ切り替えで選択状態は保持）
    },
    [],
  );

  // メモタブ切り替え時の処理
  const handleMemoTabChange = useCallback((newTab: "normal" | "deleted") => {
    setActiveMemoTab(newTab);
    // 選択解除は行わない（タブ切り替えで選択状態は保持）
  }, []);

  // 一覧でのアイテム選択切り替え
  const handleToggleItemSelection = useCallback((itemId: number) => {
    setSelectedItemsFromList((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // 右パネルを閉じる
  const handleCloseRightPanel = useCallback((onClearSelection?: () => void) => {
    const currentMode = rightPanelModeRef.current;

    setRightPanelMode(null);
    setSelectedItemsFromList(new Set());
    onClearSelection?.();

    // メモ一覧・タスク一覧を閉じる場合は、通常の表示に戻す
    if (currentMode === "memo-list" || currentMode === "task-list") {
      // 即座に両方表示に戻す
      setShowMemo(true);
      setShowTask(true);
    }
  }, []);

  // 新規作成用ハンドラー（外部から提供されるcallbackを使用）
  const createNewMemoHandler = useCallback(
    (onSelectMemo?: (memo: Memo | null) => void) => {
      setRightPanelMode(null); // リストモードを解除
      const newMemo: Memo = {
        id: 0, // 新規作成時は0
        title: "",
        content: "",
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      };

      onSelectMemo?.(newMemo);
    },
    [], // setRightPanelModeはステート更新関数なので依存配列不要
  );

  const createNewTaskHandler = useCallback(
    (onSelectTask?: (task: Task | null) => void) => {
      setRightPanelMode(null); // リストモードを解除
      const newTask: Task = {
        id: 0, // 新規作成時は0
        title: "",
        description: null,
        status:
          activeTaskTabRef.current === "deleted"
            ? "todo"
            : activeTaskTabRef.current, // 削除済みタブの場合は未着手にする
        priority: "medium",
        dueDate: null,
        categoryId: null,
        boardCategoryId: null,
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      };
      onSelectTask?.(newTask);
    },
    [], // 依存配列を空にして安定化
  );

  return {
    // 状態
    activeTaskTab,
    activeMemoTab,
    showTabText,
    rightPanelMode,
    selectedItemsFromList,
    columnCount,
    boardLayout,
    isReversed,
    showMemo,
    showTask,
    showComment,
    showListPanel,
    showDetailPanel,
    showCommentPanel,

    // セッター
    setActiveTaskTab,
    setActiveMemoTab,
    setShowTabText,
    setRightPanelMode,
    setSelectedItemsFromList,
    setColumnCount,
    setBoardLayout,
    setIsReversed,
    setShowMemo,
    setShowTask,
    setShowComment,
    setShowListPanel,
    setShowDetailPanel,
    setShowCommentPanel,

    // ハンドラー
    handleBoardLayoutChange,
    handleSettings,
    handleMemoToggle,
    handleTaskToggle,
    handleCommentToggle,
    handleListPanelToggle,
    handleDetailPanelToggle,
    handleCommentPanelToggle,
    handleTaskTabChange,
    handleMemoTabChange,
    handleToggleItemSelection,
    handleCloseRightPanel,
    createNewMemoHandler,
    createNewTaskHandler,
  };
}

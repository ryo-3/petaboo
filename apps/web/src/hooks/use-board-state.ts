import { useCallback, useEffect, useState } from "react";
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
    "normal"
  );
  const [showTabText, setShowTabText] = useState(true);

  // パネル状態
  const [rightPanelMode, setRightPanelMode] = useState<
    "editor" | "memo-list" | "task-list" | null
  >(null);
  const [selectedItemsFromList, setSelectedItemsFromList] = useState<
    Set<number>
  >(new Set());

  // 表示モード状態
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [columnCount, setColumnCount] = useState(2);
  const [showEditDate, setShowEditDate] = useState(false);

  // ボードレイアウト状態
  const [boardLayout, setBoardLayout] = useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const [isReversed, setIsReversed] = useState(false);

  // コンテンツフィルター状態
  const [showMemo, setShowMemo] = useState(true);
  const [showTask, setShowTask] = useState(true);

  // リストパネル表示時に選択状態をリセット
  useEffect(() => {
    if (rightPanelMode === "memo-list" || rightPanelMode === "task-list") {
      setSelectedItemsFromList(new Set());
    }
  }, [rightPanelMode]);

  // 右パネルの開閉に応じてタブテキストの表示を制御
  const updateShowTabText = useCallback((selectedMemo: unknown, selectedTask: unknown) => {
    if (selectedMemo || selectedTask || rightPanelMode) {
      // 右パネルが開いたらすぐにテキストを非表示
      setShowTabText(false);
    } else {
      // 右パネルが閉じたら300ms後にテキストを表示
      const timer = setTimeout(() => {
        setShowTabText(true);
      }, 300);
      return () => clearTimeout(timer);
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
    [boardLayout]
  );

  // 設定画面への遷移
  const handleSettings = useCallback(() => {
    const boardSlug = pathname.split("/")[2];
    router.push(`/boards/${boardSlug}/settings`);
  }, [pathname, router]);

  // メモボタンのハンドラー（一覧表示中は切り替え）
  const handleMemoToggle = useCallback(
    (show: boolean) => {
      if (rightPanelMode === "task-list") {
        // タスク一覧表示中にメモボタンを押したらメモ一覧に切り替え
        setRightPanelMode("memo-list");
      } else {
        // 通常の表示/非表示切り替え
        setShowMemo(show);
      }
    },
    [rightPanelMode]
  );

  // タスクボタンのハンドラー（一覧表示中は切り替え）
  const handleTaskToggle = useCallback(
    (show: boolean) => {
      if (rightPanelMode === "memo-list") {
        // メモ一覧表示中にタスクボタンを押したらタスク一覧に切り替え
        setRightPanelMode("task-list");
      } else {
        // 通常の表示/非表示切り替え
        setShowTask(show);
      }
    },
    [rightPanelMode]
  );

  // タスクタブ切り替え時の処理
  const handleTaskTabChange = useCallback(
    (newTab: "todo" | "in_progress" | "completed" | "deleted") => {
      setActiveTaskTab(newTab);
      // 選択解除は行わない（タブ切り替えで選択状態は保持）
    },
    []
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
    setRightPanelMode(null);
    setSelectedItemsFromList(new Set());
    onClearSelection?.();
  }, []);

  // 新規作成用ハンドラー（外部から提供されるcallbackを使用）
  const createNewMemoHandler = useCallback(
    (onSelectMemo?: (memo: Memo | null) => void) => {
      console.log("🟢 handleCreateNewMemo called, rightPanelMode:", rightPanelMode);
      setRightPanelMode(null); // リストモードを解除
      const newMemo: Memo = {
        id: 0, // 新規作成時は0
        title: "",
        content: "",
        createdAt: Date.now() / 1000,
        updatedAt: Date.now() / 1000,
      };
      console.log("🟢 calling onSelectMemo with:", newMemo);
      onSelectMemo?.(newMemo);
    },
    [rightPanelMode]
  );

  const createNewTaskHandler = useCallback(
    (onSelectTask?: (task: Task | null) => void) => {
      console.log("🔵 handleCreateNewTask called, rightPanelMode:", rightPanelMode);
      setRightPanelMode(null); // リストモードを解除
      const newTask: Task = {
        id: 0, // 新規作成時は0
        title: "",
        description: null,
        status: activeTaskTab === "deleted" ? "todo" : activeTaskTab, // 削除済みタブの場合は未着手にする
        priority: "medium",
        dueDate: null,
        categoryId: null,
        createdAt: Date.now() / 1000,
        updatedAt: Date.now() / 1000,
      };
      console.log("🔵 calling onSelectTask with:", newTask);
      onSelectTask?.(newTask);
    },
    [rightPanelMode, activeTaskTab]
  );

  return {
    // 状態
    activeTaskTab,
    activeMemoTab,
    showTabText,
    rightPanelMode,
    selectedItemsFromList,
    viewMode,
    columnCount,
    showEditDate,
    boardLayout,
    isReversed,
    showMemo,
    showTask,

    // セッター
    setActiveTaskTab,
    setActiveMemoTab,
    setShowTabText,
    setRightPanelMode,
    setSelectedItemsFromList,
    setViewMode,
    setColumnCount,
    setShowEditDate,
    setBoardLayout,
    setIsReversed,
    setShowMemo,
    setShowTask,

    // ハンドラー
    handleBoardLayoutChange,
    handleSettings,
    handleMemoToggle,
    handleTaskToggle,
    handleTaskTabChange,
    handleMemoTabChange,
    handleToggleItemSelection,
    handleCloseRightPanel,
    createNewMemoHandler,
    createNewTaskHandler,
    updateShowTabText,
  };
}
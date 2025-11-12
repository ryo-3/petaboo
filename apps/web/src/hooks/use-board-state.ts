import { useCallback, useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Memo } from "@/src/types/memo";
import { Task } from "@/src/types/task";
import { validatePanelToggle } from "@/src/utils/panel-helpers";

export function useBoardState() {
  const router = useRouter();
  const pathname = usePathname();

  // デスクトップ判定（768px以上）
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

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

  // コンテンツフィルター状態（非選択時用、localStorageから復元）
  const [showMemo, setShowMemo] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("board-show-memo");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return true;
  });
  const [showTask, setShowTask] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("board-show-task");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return true;
  });
  const [showComment, setShowComment] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("board-show-comment");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return true;
  });

  // 選択時のパネル表示状態（localStorageから復元）
  const [showListPanel, setShowListPanel] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("board-show-list-panel");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return true;
  });
  const [showDetailPanel, setShowDetailPanel] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("board-show-detail-panel");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return true;
  });
  const [showCommentPanel, setShowCommentPanel] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("board-show-comment-panel");
      if (saved !== null) {
        return saved === "true";
      }
    }
    return true;
  });

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

  // 非選択時のパネル表示状態をlocalStorageに保存（デスクトップのみ）
  useEffect(() => {
    if (typeof window !== "undefined" && isDesktop) {
      localStorage.setItem("board-show-memo", String(showMemo));
    }
  }, [showMemo, isDesktop]);

  useEffect(() => {
    if (typeof window !== "undefined" && isDesktop) {
      localStorage.setItem("board-show-task", String(showTask));
    }
  }, [showTask, isDesktop]);

  useEffect(() => {
    if (typeof window !== "undefined" && isDesktop) {
      localStorage.setItem("board-show-comment", String(showComment));
    }
  }, [showComment, isDesktop]);

  // 選択時のパネル表示状態をlocalStorageに保存（デスクトップのみ）
  useEffect(() => {
    if (typeof window !== "undefined" && isDesktop) {
      localStorage.setItem("board-show-list-panel", String(showListPanel));
    }
  }, [showListPanel, isDesktop]);

  useEffect(() => {
    if (typeof window !== "undefined" && isDesktop) {
      localStorage.setItem("board-show-detail-panel", String(showDetailPanel));
    }
  }, [showDetailPanel, isDesktop]);

  useEffect(() => {
    if (typeof window !== "undefined" && isDesktop) {
      localStorage.setItem(
        "board-show-comment-panel",
        String(showCommentPanel),
      );
    }
  }, [showCommentPanel, isDesktop]);

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
      // バリデーション: 最低1つは表示する必要がある
      if (
        !validatePanelToggle(
          { left: showMemo, center: showTask, right: showComment },
          "left",
          show,
        )
      ) {
        return;
      }
      setShowMemo(show);
    },
    [showMemo, showTask, showComment],
  );

  // タスクボタンのハンドラー
  const handleTaskToggle = useCallback(
    (show: boolean) => {
      // バリデーション: 最低1つは表示する必要がある
      if (
        !validatePanelToggle(
          { left: showMemo, center: showTask, right: showComment },
          "center",
          show,
        )
      ) {
        return;
      }
      setShowTask(show);
    },
    [showMemo, showTask, showComment],
  );

  // コメントボタンのハンドラー（非選択時）
  const handleCommentToggle = useCallback(
    (show: boolean) => {
      // バリデーション: 最低1つは表示する必要がある
      if (
        !validatePanelToggle(
          { left: showMemo, center: showTask, right: showComment },
          "right",
          show,
        )
      ) {
        return;
      }
      setShowComment(show);
    },
    [showMemo, showTask, showComment],
  );

  // 選択時のパネルトグルハンドラー
  const handleListPanelToggle = useCallback(
    (show: boolean) => {
      // バリデーション: 最低1つは表示する必要がある
      if (
        !validatePanelToggle(
          {
            left: showListPanel,
            center: showDetailPanel,
            right: showCommentPanel,
          },
          "left",
          show,
        )
      ) {
        return;
      }
      setShowListPanel(show);
    },
    [showListPanel, showDetailPanel, showCommentPanel],
  );

  const handleDetailPanelToggle = useCallback(
    (show: boolean) => {
      // バリデーション: 最低1つは表示する必要がある
      if (
        !validatePanelToggle(
          {
            left: showListPanel,
            center: showDetailPanel,
            right: showCommentPanel,
          },
          "center",
          show,
        )
      ) {
        return;
      }
      setShowDetailPanel(show);
    },
    [showListPanel, showDetailPanel, showCommentPanel],
  );

  const handleCommentPanelToggle = useCallback(
    (show: boolean) => {
      // バリデーション: 最低1つは表示する必要がある
      if (
        !validatePanelToggle(
          {
            left: showListPanel,
            center: showDetailPanel,
            right: showCommentPanel,
          },
          "right",
          show,
        )
      ) {
        return;
      }
      setShowCommentPanel(show);
    },
    [showListPanel, showDetailPanel, showCommentPanel],
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

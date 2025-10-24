"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface MultiSelectionContextType {
  // 選択モード
  selectionMode: "select" | "check";
  setSelectionMode: (mode: "select" | "check") => void;

  // メモの選択状態
  checkedNormalMemos: Set<string | number>;
  checkedDeletedMemos: Set<string | number>;

  // タスクの選択状態
  checkedTodoTasks: Set<string | number>;
  checkedInProgressTasks: Set<string | number>;
  checkedCompletedTasks: Set<string | number>;
  checkedDeletedTasks: Set<string | number>;

  // ヘルパー関数
  getCheckedMemos: (tab: string) => Set<string | number>;
  setCheckedMemos: (
    tab: string,
    value:
      | Set<string | number>
      | ((prev: Set<string | number>) => Set<string | number>),
  ) => void;
  getCheckedTasks: (tab: string) => Set<string | number>;
  setCheckedTasks: (
    tab: string,
    value:
      | Set<string | number>
      | ((prev: Set<string | number>) => Set<string | number>),
  ) => void;

  handleMemoSelectionToggle: (
    memoId: string | number,
    activeMemoTab: string,
  ) => void;
  handleTaskSelectionToggle: (
    taskId: string | number,
    activeTaskTab: string,
  ) => void;

  handleSelectionModeChange: (mode: "select" | "check") => void;
}

const MultiSelectionContext = createContext<
  MultiSelectionContextType | undefined
>(undefined);

export function MultiSelectionProvider({ children }: { children: ReactNode }) {
  // 選択モード
  const [selectionMode, setSelectionMode] = useState<"select" | "check">(
    "select",
  );

  // メモの選択状態
  const [checkedNormalMemos, setCheckedNormalMemos] = useState<
    Set<string | number>
  >(new Set());
  const [checkedDeletedMemos, setCheckedDeletedMemos] = useState<
    Set<string | number>
  >(new Set());

  // タスクの選択状態
  const [checkedTodoTasks, setCheckedTodoTasks] = useState<
    Set<string | number>
  >(new Set());
  const [checkedInProgressTasks, setCheckedInProgressTasks] = useState<
    Set<string | number>
  >(new Set());
  const [checkedCompletedTasks, setCheckedCompletedTasks] = useState<
    Set<string | number>
  >(new Set());
  const [checkedDeletedTasks, setCheckedDeletedTasks] = useState<
    Set<string | number>
  >(new Set());

  // メモの選択状態を取得
  const getCheckedMemos = useCallback(
    (tab: string) => {
      const result =
        tab === "normal" ? checkedNormalMemos : checkedDeletedMemos;
      return result;
    },
    [checkedNormalMemos, checkedDeletedMemos],
  );

  // メモの選択状態を設定
  const setCheckedMemos = useCallback(
    (
      tab: string,
      value:
        | Set<string | number>
        | ((prev: Set<string | number>) => Set<string | number>),
    ) => {
      if (tab === "normal") {
        setCheckedNormalMemos(value);
      } else {
        setCheckedDeletedMemos(value);
      }
    },
    [],
  );

  // タスクの選択状態を取得
  const getCheckedTasks = useCallback(
    (tab: string) => {
      switch (tab) {
        case "todo":
          return checkedTodoTasks;
        case "in_progress":
          return checkedInProgressTasks;
        case "completed":
          return checkedCompletedTasks;
        case "deleted":
          return checkedDeletedTasks;
        default:
          return checkedTodoTasks;
      }
    },
    [
      checkedTodoTasks,
      checkedInProgressTasks,
      checkedCompletedTasks,
      checkedDeletedTasks,
    ],
  );

  // タスクの選択状態を設定
  const setCheckedTasks = useCallback(
    (
      tab: string,
      value:
        | Set<string | number>
        | ((prev: Set<string | number>) => Set<string | number>),
    ) => {
      let targetSetter;
      switch (tab) {
        case "todo":
          targetSetter = setCheckedTodoTasks;
          break;
        case "in_progress":
          targetSetter = setCheckedInProgressTasks;
          break;
        case "completed":
          targetSetter = setCheckedCompletedTasks;
          break;
        case "deleted":
          targetSetter = setCheckedDeletedTasks;
          break;
        default:
          targetSetter = setCheckedTodoTasks;
          break;
      }

      if (typeof value === "function") {
        targetSetter((prev) => {
          const result = value(prev);
          return result;
        });
      } else {
        targetSetter(value);
      }
    },
    [],
  );

  // メモの選択トグル
  const handleMemoSelectionToggle = useCallback(
    (memoId: string | number, activeMemoTab: string) => {
      setCheckedMemos(activeMemoTab, (prev) => {
        const newSet = new Set(prev);
        if (newSet.has(memoId)) {
          newSet.delete(memoId);
        } else {
          newSet.add(memoId);
        }
        return newSet;
      });
    },
    [setCheckedMemos],
  );

  // タスクの選択トグル
  const handleTaskSelectionToggle = useCallback(
    (taskId: string | number, activeTaskTab: string) => {
      setCheckedTasks(activeTaskTab, (prev) => {
        const newSet = new Set(prev);
        if (newSet.has(taskId)) {
          newSet.delete(taskId);
        } else {
          newSet.add(taskId);
        }
        return newSet;
      });
    },
    [setCheckedTasks],
  );

  // 選択モード切り替え
  const handleSelectionModeChange = useCallback((mode: "select" | "check") => {
    setSelectionMode(mode);
    // checkモードからselectモードに切り替える時、選択状態をクリア
    if (mode === "select") {
      setCheckedNormalMemos(new Set());
      setCheckedDeletedMemos(new Set());
      setCheckedTodoTasks(new Set());
      setCheckedInProgressTasks(new Set());
      setCheckedCompletedTasks(new Set());
      setCheckedDeletedTasks(new Set());
    }
  }, []);

  const value = {
    // 選択モード
    selectionMode,
    setSelectionMode,

    // メモの選択状態
    checkedNormalMemos,
    checkedDeletedMemos,

    // タスクの選択状態
    checkedTodoTasks,
    checkedInProgressTasks,
    checkedCompletedTasks,
    checkedDeletedTasks,

    // ヘルパー関数
    getCheckedMemos,
    setCheckedMemos,
    getCheckedTasks,
    setCheckedTasks,
    handleMemoSelectionToggle,
    handleTaskSelectionToggle,

    handleSelectionModeChange,
  };

  return (
    <MultiSelectionContext.Provider value={value}>
      {children}
    </MultiSelectionContext.Provider>
  );
}

export function useMultiSelection(
  activeMemoTab: string,
  activeTaskTab: string = "todo",
) {
  const context = useContext(MultiSelectionContext);
  if (!context) {
    throw new Error(
      "useMultiSelection must be used within a MultiSelectionProvider",
    );
  }

  // 現在のタブに応じた選択状態を計算
  const checkedMemos = context.getCheckedMemos(activeMemoTab);
  const checkedTasks = context.getCheckedTasks(activeTaskTab);

  // メモ・タスクのトグル関数をカリー化
  const handleMemoSelectionToggle = useCallback(
    (memoId: string | number) => {
      context.handleMemoSelectionToggle(memoId, activeMemoTab);
    },
    [context, activeMemoTab],
  );

  const handleTaskSelectionToggle = useCallback(
    (taskId: string | number) => {
      context.handleTaskSelectionToggle(taskId, activeTaskTab);
    },
    [context, activeTaskTab],
  );

  return {
    // 選択モード
    selectionMode: context.selectionMode,
    setSelectionMode: context.setSelectionMode,
    handleSelectionModeChange: context.handleSelectionModeChange,

    // メモの選択状態（互換性のため）
    checkedNormalMemos: context.checkedNormalMemos,
    setCheckedNormalMemos: (
      value:
        | Set<string | number>
        | ((prev: Set<string | number>) => Set<string | number>),
    ) => {
      context.setCheckedMemos("normal", value);
    },
    checkedDeletedMemos: context.checkedDeletedMemos,
    setCheckedDeletedMemos: (
      value:
        | Set<string | number>
        | ((prev: Set<string | number>) => Set<string | number>),
    ) => {
      context.setCheckedMemos("deleted", value);
    },

    // タスクの選択状態
    checkedTodoTasks: context.checkedTodoTasks,
    setCheckedTodoTasks: (
      value:
        | Set<string | number>
        | ((prev: Set<string | number>) => Set<string | number>),
    ) => {
      context.setCheckedTasks("todo", value);
    },
    checkedInProgressTasks: context.checkedInProgressTasks,
    setCheckedInProgressTasks: (
      value:
        | Set<string | number>
        | ((prev: Set<string | number>) => Set<string | number>),
    ) => {
      context.setCheckedTasks("in_progress", value);
    },
    checkedCompletedTasks: context.checkedCompletedTasks,
    setCheckedCompletedTasks: (
      value:
        | Set<string | number>
        | ((prev: Set<string | number>) => Set<string | number>),
    ) => {
      context.setCheckedTasks("completed", value);
    },
    checkedDeletedTasks: context.checkedDeletedTasks,
    setCheckedDeletedTasks: (
      value:
        | Set<string | number>
        | ((prev: Set<string | number>) => Set<string | number>),
    ) => {
      context.setCheckedTasks("deleted", value);
    },

    // ヘルパー関数
    getCheckedMemos: context.getCheckedMemos,
    setCheckedMemos: context.setCheckedMemos,
    getCheckedTasks: context.getCheckedTasks,
    setCheckedTasks: context.setCheckedTasks,
    handleMemoSelectionToggle,
    handleTaskSelectionToggle,

    // 現在のタブの選択状態
    checkedMemos,
    checkedTasks,
  };
}

"use client";

import { useState } from "react";

interface UseMultiSelectionProps {
  activeMemoTab: string;
  activeTaskTab: string;
}

interface MultiSelectionHookReturn {
  // 選択モード
  selectionMode: "select" | "check";
  setSelectionMode: (mode: "select" | "check") => void;
  handleSelectionModeChange: (mode: "select" | "check") => void;

  // メモの選択状態
  checkedMemos: Set<string | number>;
  setCheckedMemos: (
    value:
      | Set<string | number>
      | ((prev: Set<string | number>) => Set<string | number>),
  ) => void;
  handleMemoSelectionToggle: (memoId: string | number) => void;

  // タスクの選択状態
  checkedTasks: Set<string | number>;
  setCheckedTasks: (
    value:
      | Set<string | number>
      | ((prev: Set<string | number>) => Set<string | number>),
  ) => void;
  handleTaskSelectionToggle: (taskId: string | number) => void;

  // 互換性のための個別状態（廃止予定）
  checkedNormalMemos: Set<string | number>;
  setCheckedNormalMemos: (
    value:
      | Set<string | number>
      | ((prev: Set<string | number>) => Set<string | number>),
  ) => void;
  checkedDeletedMemos: Set<string | number>;
  setCheckedDeletedMemos: (
    value:
      | Set<string | number>
      | ((prev: Set<string | number>) => Set<string | number>),
  ) => void;
  checkedTodoTasks: Set<string | number>;
  setCheckedTodoTasks: (
    value:
      | Set<string | number>
      | ((prev: Set<string | number>) => Set<string | number>),
  ) => void;
  checkedInProgressTasks: Set<string | number>;
  setCheckedInProgressTasks: (
    value:
      | Set<string | number>
      | ((prev: Set<string | number>) => Set<string | number>),
  ) => void;
  checkedCheckingTasks: Set<string | number>;
  setCheckedCheckingTasks: (
    value:
      | Set<string | number>
      | ((prev: Set<string | number>) => Set<string | number>),
  ) => void;
  checkedCompletedTasks: Set<string | number>;
  setCheckedCompletedTasks: (
    value:
      | Set<string | number>
      | ((prev: Set<string | number>) => Set<string | number>),
  ) => void;
  checkedDeletedTasks: Set<string | number>;
  setCheckedDeletedTasks: (
    value:
      | Set<string | number>
      | ((prev: Set<string | number>) => Set<string | number>),
  ) => void;
}

/**
 * マルチ選択機能を管理するカスタムフック
 * memo-screenと同じシンプルなuseStateベース
 */
export function useMultiSelection({
  activeMemoTab,
  activeTaskTab,
}: UseMultiSelectionProps): MultiSelectionHookReturn {
  // 選択モード管理
  const [selectionMode, setSelectionMode] = useState<"select" | "check">(
    "select",
  );

  // メモの選択状態（タブ別）
  const [checkedNormalMemos, setCheckedNormalMemos] = useState<
    Set<string | number>
  >(new Set());
  const [checkedDeletedMemos, setCheckedDeletedMemos] = useState<
    Set<string | number>
  >(new Set());

  // タスクの選択状態（タブ別）
  const [checkedTodoTasks, setCheckedTodoTasks] = useState<
    Set<string | number>
  >(new Set());
  const [checkedInProgressTasks, setCheckedInProgressTasks] = useState<
    Set<string | number>
  >(new Set());
  const [checkedCheckingTasks, setCheckedCheckingTasks] = useState<
    Set<string | number>
  >(new Set());
  const [checkedCompletedTasks, setCheckedCompletedTasks] = useState<
    Set<string | number>
  >(new Set());
  const [checkedDeletedTasks, setCheckedDeletedTasks] = useState<
    Set<string | number>
  >(new Set());

  // 現在のタブに応じた選択状態を返す
  const checkedMemos =
    activeMemoTab === "normal" ? checkedNormalMemos : checkedDeletedMemos;
  const checkedTasks = (() => {
    switch (activeTaskTab) {
      case "todo":
        return checkedTodoTasks;
      case "in_progress":
        return checkedInProgressTasks;
      case "checking":
        return checkedCheckingTasks;
      case "completed":
        return checkedCompletedTasks;
      case "deleted":
        return checkedDeletedTasks;
      default:
        return checkedTodoTasks;
    }
  })();

  // 現在のタブに応じたsetter
  const setCheckedMemos =
    activeMemoTab === "normal" ? setCheckedNormalMemos : setCheckedDeletedMemos;
  const setCheckedTasks = (() => {
    switch (activeTaskTab) {
      case "todo":
        return setCheckedTodoTasks;
      case "in_progress":
        return setCheckedInProgressTasks;
      case "checking":
        return setCheckedCheckingTasks;
      case "completed":
        return setCheckedCompletedTasks;
      case "deleted":
        return setCheckedDeletedTasks;
      default:
        return setCheckedTodoTasks;
    }
  })();

  // 削除済みタブのタスクを選択した時も正しく動作するよう、setterを返す
  // ※ checkedDeletedTasksは上記のswitch文でactiveTaskTab === "deleted"の時に返される

  // メモの選択トグル（activeMemoTabの現在値に応じて動的にsetterを選択）
  const handleMemoSelectionToggle = (memoId: string | number) => {
    const currentSetter =
      activeMemoTab === "normal"
        ? setCheckedNormalMemos
        : setCheckedDeletedMemos;

    currentSetter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memoId)) {
        newSet.delete(memoId);
      } else {
        newSet.add(memoId);
      }
      return newSet;
    });
  };

  // タスクの選択トグル（activeTaskTabの現在値に応じて動的にsetterを選択）
  const handleTaskSelectionToggle = (taskId: string | number) => {
    const currentSetter = (() => {
      switch (activeTaskTab) {
        case "todo":
          return setCheckedTodoTasks;
        case "in_progress":
          return setCheckedInProgressTasks;
        case "checking":
          return setCheckedCheckingTasks;
        case "completed":
          return setCheckedCompletedTasks;
        case "deleted":
          return setCheckedDeletedTasks;
        default:
          return setCheckedTodoTasks;
      }
    })();

    currentSetter((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  // 選択モード切り替え
  const handleSelectionModeChange = (mode: "select" | "check") => {
    setSelectionMode(mode);
    // checkモードからselectモードに切り替える時、選択状態をクリア
    if (mode === "select") {
      setCheckedNormalMemos(new Set());
      setCheckedDeletedMemos(new Set());
      setCheckedTodoTasks(new Set());
      setCheckedInProgressTasks(new Set());
      setCheckedCheckingTasks(new Set());
      setCheckedCompletedTasks(new Set());
      setCheckedDeletedTasks(new Set());
    }
  };

  return {
    // 選択モード
    selectionMode,
    setSelectionMode,
    handleSelectionModeChange,

    // 現在のタブの選択状態
    checkedMemos,
    setCheckedMemos,
    handleMemoSelectionToggle,

    checkedTasks,
    setCheckedTasks,
    handleTaskSelectionToggle,

    // 互換性のための個別状態
    checkedNormalMemos,
    setCheckedNormalMemos,
    checkedDeletedMemos,
    setCheckedDeletedMemos,
    checkedTodoTasks,
    setCheckedTodoTasks,
    checkedInProgressTasks,
    setCheckedInProgressTasks,
    checkedCheckingTasks,
    setCheckedCheckingTasks,
    checkedCompletedTasks,
    setCheckedCompletedTasks,
    checkedDeletedTasks,
    setCheckedDeletedTasks,
  };
}

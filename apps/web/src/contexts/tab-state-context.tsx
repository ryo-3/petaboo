"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

export type TaskTabType =
  | "todo"
  | "in_progress"
  | "checking"
  | "completed"
  | "deleted";
export type MemoTabType = "normal" | "deleted";

interface TabStateContextType {
  // タスク一覧用
  taskListTab: TaskTabType;
  setTaskListTab: (tab: TaskTabType) => void;
  resetTaskListTab: () => void;

  // メモ一覧用
  memoListTab: MemoTabType;
  setMemoListTab: (tab: MemoTabType) => void;
  resetMemoListTab: () => void;

  // ボード詳細用（タスク）
  boardTaskTab: TaskTabType;
  setBoardTaskTab: (tab: TaskTabType) => void;
  resetBoardTaskTab: () => void;

  // ボード詳細用（メモ）
  boardMemoTab: MemoTabType;
  setBoardMemoTab: (tab: MemoTabType) => void;
  resetBoardMemoTab: () => void;
}

const TabStateContext = createContext<TabStateContextType | null>(null);

export function TabStateProvider({ children }: { children: ReactNode }) {
  // タスク一覧用
  const [taskListTab, setTaskListTabState] = useState<TaskTabType>("todo");

  // メモ一覧用
  const [memoListTab, setMemoListTabState] = useState<MemoTabType>("normal");

  // ボード詳細用
  const [boardTaskTab, setBoardTaskTabState] = useState<TaskTabType>("todo");
  const [boardMemoTab, setBoardMemoTabState] = useState<MemoTabType>("normal");

  const setTaskListTab = useCallback((tab: TaskTabType) => {
    console.log("[TabStateContext] setTaskListTab:", tab);
    setTaskListTabState(tab);
  }, []);

  const resetTaskListTab = useCallback(() => {
    console.log("[TabStateContext] resetTaskListTab -> todo");
    setTaskListTabState("todo");
  }, []);

  const setMemoListTab = useCallback((tab: MemoTabType) => {
    setMemoListTabState(tab);
  }, []);

  const resetMemoListTab = useCallback(() => {
    setMemoListTabState("normal");
  }, []);

  const setBoardTaskTab = useCallback((tab: TaskTabType) => {
    setBoardTaskTabState(tab);
  }, []);

  const resetBoardTaskTab = useCallback(() => {
    setBoardTaskTabState("todo");
  }, []);

  const setBoardMemoTab = useCallback((tab: MemoTabType) => {
    setBoardMemoTabState(tab);
  }, []);

  const resetBoardMemoTab = useCallback(() => {
    setBoardMemoTabState("normal");
  }, []);

  return (
    <TabStateContext.Provider
      value={{
        taskListTab,
        setTaskListTab,
        resetTaskListTab,
        memoListTab,
        setMemoListTab,
        resetMemoListTab,
        boardTaskTab,
        setBoardTaskTab,
        resetBoardTaskTab,
        boardMemoTab,
        setBoardMemoTab,
        resetBoardMemoTab,
      }}
    >
      {children}
    </TabStateContext.Provider>
  );
}

export function useTabState(): TabStateContextType {
  const context = useContext(TabStateContext);
  if (!context) {
    throw new Error("useTabState must be used within TabStateProvider");
  }
  return context;
}

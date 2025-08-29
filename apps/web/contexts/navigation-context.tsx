"use client";

import { createContext, useContext, ReactNode, useState } from "react";
import type { Memo, DeletedMemo } from "@/src/types/memo";
import type { Task, DeletedTask } from "@/src/types/task";

type ScreenMode =
  | "home"
  | "memo"
  | "task"
  | "create"
  | "search"
  | "settings"
  | "board";

interface NavigationContextType {
  screenMode: ScreenMode;
  currentMode: "memo" | "task" | "board";
  setScreenMode: (mode: ScreenMode) => void;
  setCurrentMode: (mode: "memo" | "task" | "board") => void;
  isFromBoardDetail: boolean;
  setIsFromBoardDetail: (value: boolean) => void;
  // メイン画面のアイテム選択ハンドラー
  handleMainSelectMemo?: (memo: Memo | null) => void;
  handleMainSelectTask?: (task: Task | null) => void;
  setHandleMainSelectMemo?: (
    handler: ((memo: Memo | null) => void) | undefined,
  ) => void;
  setHandleMainSelectTask?: (
    handler: ((task: Task | null) => void) | undefined,
  ) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

interface NavigationProviderProps {
  children: ReactNode;
  initialCurrentMode?: "memo" | "task" | "board";
  initialScreenMode?: ScreenMode;
}

export function NavigationProvider({
  children,
  initialCurrentMode = "memo",
  initialScreenMode = "home",
}: NavigationProviderProps) {
  const [screenMode, setScreenMode] = useState<ScreenMode>(initialScreenMode);
  const [currentMode, setCurrentMode] = useState<"memo" | "task" | "board">(
    initialCurrentMode,
  );
  const [isFromBoardDetail, setIsFromBoardDetail] = useState(false);
  const [handleMainSelectMemo, setHandleMainSelectMemo] = useState<
    ((memo: Memo | null) => void) | undefined
  >();
  const [handleMainSelectTask, setHandleMainSelectTask] = useState<
    ((task: Task | null) => void) | undefined
  >();

  return (
    <NavigationContext.Provider
      value={{
        screenMode,
        currentMode,
        setScreenMode,
        setCurrentMode,
        isFromBoardDetail,
        setIsFromBoardDetail,
        handleMainSelectMemo,
        handleMainSelectTask,
        setHandleMainSelectMemo,
        setHandleMainSelectTask,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
}

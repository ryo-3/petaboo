"use client";

import { createContext, useContext, ReactNode, useState } from "react";

type ScreenMode = "home" | "memo" | "task" | "create" | "search" | "settings" | "board";

interface NavigationContextType {
  screenMode: ScreenMode;
  currentMode: "memo" | "task" | "board";
  setScreenMode: (mode: ScreenMode) => void;
  setCurrentMode: (mode: "memo" | "task" | "board") => void;
  isFromBoardDetail: boolean;
  setIsFromBoardDetail: (value: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
  initialCurrentMode?: "memo" | "task" | "board";
  initialScreenMode?: ScreenMode;
}

export function NavigationProvider({ 
  children, 
  initialCurrentMode = "memo",
  initialScreenMode = "home"
}: NavigationProviderProps) {
  const [screenMode, setScreenMode] = useState<ScreenMode>(initialScreenMode);
  const [currentMode, setCurrentMode] = useState<"memo" | "task" | "board">(initialCurrentMode);
  const [isFromBoardDetail, setIsFromBoardDetail] = useState(false);

  return (
    <NavigationContext.Provider value={{
      screenMode,
      currentMode,
      setScreenMode,
      setCurrentMode,
      isFromBoardDetail,
      setIsFromBoardDetail
    }}>
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
"use client";

import { createContext, useContext, ReactNode, useState } from "react";

type ScreenMode = "home" | "memo" | "task" | "create" | "search" | "settings" | "board";

interface NavigationContextType {
  screenMode: ScreenMode;
  currentMode: "memo" | "task" | "board";
  setScreenMode: (mode: ScreenMode) => void;
  setCurrentMode: (mode: "memo" | "task" | "board") => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [screenMode, setScreenMode] = useState<ScreenMode>("home");
  const [currentMode, setCurrentMode] = useState<"memo" | "task" | "board">("memo");

  return (
    <NavigationContext.Provider value={{
      screenMode,
      currentMode,
      setScreenMode,
      setCurrentMode
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
"use client";

import { createContext, useContext, ReactNode, useState, useEffect, useSyncExternalStore } from "react";

type ScreenMode = "home" | "memo" | "task" | "create" | "search" | "settings" | "board";

interface NavigationContextType {
  screenMode: ScreenMode;
  currentMode: "memo" | "task" | "board";
  setScreenMode: (mode: ScreenMode) => void;
  setCurrentMode: (mode: "memo" | "task" | "board") => void;
  isFromBoardDetail: boolean;
  setIsFromBoardDetail: (value: boolean) => void;
  isHydrated: boolean;
  navigateToBoard: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ 
  children, 
  initialCurrentMode 
}: { 
  children: ReactNode;
  initialCurrentMode?: "memo" | "task" | "board";
}) {
  // sessionStorageから初期値を取得
  const [isFromBoardDetail, setIsFromBoardDetail] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('fromBoardDetail') === 'true';
    }
    return false;
  });

  // シンプルな初期値設定
  const getInitialMode = (): "memo" | "task" | "board" => {
    if (initialCurrentMode) {
      return initialCurrentMode;
    }
    
    if (typeof window !== 'undefined') {
      const fromBoardDetail = sessionStorage.getItem('fromBoardDetail') === 'true';
      const currentPath = window.location.pathname;
      
      if (currentPath.startsWith('/boards/') || fromBoardDetail) {
        return "board";
      }
    }
    
    return "memo";
  };

  const [currentMode, setCurrentMode] = useState<"memo" | "task" | "board">(getInitialMode);

  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
    
    // Hydration完了後に適切な初期状態を設定
    const currentPath = window.location.pathname;
    const fromBoardDetail = sessionStorage.getItem('fromBoardDetail') === 'true';
    
    if (currentPath.startsWith('/boards/')) {
      console.log('🔍 NavigationContext Hydration完了: ボード詳細ページ');
      setScreenMode("board");
      setCurrentMode("board");
    } else if (currentPath === "/" && fromBoardDetail) {
      console.log('🔍 NavigationContext Hydration完了: ボード詳細から戻った');
      setScreenMode("board");
      setCurrentMode("board");
    }
  }, []);

  const [screenMode, setScreenMode] = useState<ScreenMode>("home");

  // sessionStorageと状態を同期
  useEffect(() => {
    if (isFromBoardDetail) {
      sessionStorage.setItem('fromBoardDetail', 'true');
    } else {
      sessionStorage.removeItem('fromBoardDetail');
    }
  }, [isFromBoardDetail]);

  // ボード一覧に遷移する関数
  const navigateToBoard = () => {
    console.log('🔍 navigateToBoard: 状態をboardに設定');
    setScreenMode("board");
    setCurrentMode("board");
    setIsFromBoardDetail(true);
  };

  return (
    <NavigationContext.Provider value={{
      screenMode,
      currentMode,
      setScreenMode,
      setCurrentMode,
      isFromBoardDetail,
      setIsFromBoardDetail,
      isHydrated,
      navigateToBoard
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
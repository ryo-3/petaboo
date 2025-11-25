"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface PageVisibilityContextType {
  isVisible: boolean;
  isMouseActive: boolean;
}

const PageVisibilityContext = createContext<
  PageVisibilityContextType | undefined
>(undefined);

export function PageVisibilityProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(() => {
    // SSR対応: documentが存在する場合のみチェック
    return typeof document !== "undefined" ? !document.hidden : true;
  });

  const [isMouseActive, setIsMouseActive] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isVisible]);

  // マウス活動監視
  useEffect(() => {
    let mouseInactiveTimer: NodeJS.Timeout;

    const handleMouseEnter = () => {
      setIsMouseActive(true);
      clearTimeout(mouseInactiveTimer);
    };

    const handleMouseLeave = () => {
      // 2秒後に非アクティブに設定
      mouseInactiveTimer = setTimeout(() => {
        setIsMouseActive(false);
      }, 2000);
    };

    // マウス移動でもアクティブ状態を更新
    const handleMouseMove = () => {
      if (!isMouseActive) {
        setIsMouseActive(true);
      }
      clearTimeout(mouseInactiveTimer);

      // 10秒間マウス移動がなければ非アクティブに
      mouseInactiveTimer = setTimeout(() => {
        setIsMouseActive(false);
      }, 10000);
    };

    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      clearTimeout(mouseInactiveTimer);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isMouseActive]);

  return (
    <PageVisibilityContext.Provider value={{ isVisible, isMouseActive }}>
      {children}
    </PageVisibilityContext.Provider>
  );
}

export function usePageVisibility() {
  const context = useContext(PageVisibilityContext);
  if (context === undefined) {
    throw new Error(
      "usePageVisibility must be used within a PageVisibilityProvider",
    );
  }
  return context;
}

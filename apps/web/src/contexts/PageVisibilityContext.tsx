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

      // const status = visible ? "アクティブ" : "バックグラウンド";
      // const timestamp = new Date().toLocaleTimeString();
      // console.log(`👁️ [${timestamp}] [Context] ページ状態変更: ${status}`);

      // if (!visible) {
      //   console.log(`⏸️ [${timestamp}] [Context] 全API停止: バックグラウンド`);
      // } else {
      //   console.log(`▶️ [${timestamp}] [Context] 全API再開: アクティブ`);
      // }
    };

    // 初期状態をログ出力
    // const initialStatus = isVisible ? "アクティブ" : "バックグラウンド";
    // console.log(`👁️ [Context初期化] ページ状態: ${initialStatus}`);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // console.log(`👁️ [Context終了] Page Visibility監視終了`);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isVisible]);

  // マウス活動監視
  useEffect(() => {
    let mouseInactiveTimer: NodeJS.Timeout;

    const handleMouseEnter = () => {
      setIsMouseActive(true);
      clearTimeout(mouseInactiveTimer);
      // console.log("🖱️ [Context] マウス復帰: ページ内");
    };

    const handleMouseLeave = () => {
      // 2秒後に非アクティブに設定
      mouseInactiveTimer = setTimeout(() => {
        setIsMouseActive(false);
        // console.log("🖱️ [Context] マウス非アクティブ: 2秒経過");
      }, 2000);
    };

    // マウス移動でもアクティブ状態を更新
    const handleMouseMove = () => {
      if (!isMouseActive) {
        setIsMouseActive(true);
        // console.log("🖱️ [Context] マウス活動検知: アクティブ復帰");
      }
      clearTimeout(mouseInactiveTimer);

      // 10秒間マウス移動がなければ非アクティブに
      mouseInactiveTimer = setTimeout(() => {
        setIsMouseActive(false);
        // console.log("🖱️ [Context] マウス非アクティブ: 10秒無操作");
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

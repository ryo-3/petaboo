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
}

const PageVisibilityContext = createContext<
  PageVisibilityContextType | undefined
>(undefined);

export function PageVisibilityProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(() => {
    // SSR対応: documentが存在する場合のみチェック
    return typeof document !== "undefined" ? !document.hidden : true;
  });

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);

      const status = visible ? "アクティブ" : "バックグラウンド";
      const timestamp = new Date().toLocaleTimeString();
      console.log(`👁️ [${timestamp}] [Context] ページ状態変更: ${status}`);

      if (!visible) {
        console.log(`⏸️ [${timestamp}] [Context] 全API停止: バックグラウンド`);
      } else {
        console.log(`▶️ [${timestamp}] [Context] 全API再開: アクティブ`);
      }
    };

    // 初期状態をログ出力
    const initialStatus = isVisible ? "アクティブ" : "バックグラウンド";
    console.log(`👁️ [Context初期化] ページ状態: ${initialStatus}`);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      console.log(`👁️ [Context終了] Page Visibility監視終了`);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isVisible]);

  return (
    <PageVisibilityContext.Provider value={{ isVisible }}>
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

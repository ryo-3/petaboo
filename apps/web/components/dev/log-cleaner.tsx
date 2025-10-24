"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * 開発用ログクリア機能
 * ページリロード時とFast Refresh（画面更新）時に自動でサーバーログをクリア
 * ローカル環境のみ、認証関連ページでは実行しない
 */
export function LogCleaner() {
  const lastClearTime = useRef<number>(0);
  const clearCount = useRef<number>(0);
  const pathname = usePathname();

  useEffect(() => {
    // ローカル開発環境でのみ実行（localhost チェック）
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    // 認証関連ページでは実行しない
    const isAuthPage =
      pathname?.includes("/sign-in") ||
      pathname?.includes("/sign-up") ||
      pathname?.includes("/join");

    if (
      false &&
      process.env.NODE_ENV === "development" &&
      isLocalhost &&
      !isAuthPage
    ) {
      // ログクリア関数（デバウンス機能付き）
      const clearLogs = () => {
        const now = Date.now();
        // 前回のクリアから1秒以上経過している場合のみ実行
        if (now - lastClearTime.current > 1000) {
          lastClearTime.current = now;
          clearCount.current++;

          // Next.jsのAPIルートを使用（404エラー対応）
          fetch("/api/clear-logs", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then((res) => {
              if (res.ok) {
                return res.json();
              } else {
                // 404や他のHTTPエラーの場合はスキップ
                throw new Error(`HTTP ${res.status}: ${res.statusText}`);
              }
            })
            .then(() => {})
            .catch((error) => {
              // エラーログを簡略化（404エラーの場合は静かに処理）
              if (!error.message.includes("404")) {
                console.error("[LogCleaner] Failed to clear logs:", error);
              }
            });
        }
      };

      // 初回ロード時にログをクリア
      clearLogs();

      // Fast Refresh検知用
      // コンポーネントが再マウントされるたびに実行される
      // （Fast Refreshでコンポーネントが更新される際に呼ばれる）
      return () => {
        // クリーンアップ時（次回のFast Refresh前）にもログクリア
        clearLogs();
      };
    }
  }, [pathname]);

  return null; // UIは表示しない
}

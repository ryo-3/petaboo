"use client";

import { useEffect, useRef } from "react";

/**
 * 開発用ログクリア機能
 * ページリロード時とFast Refresh（画面更新）時に自動でサーバーログをクリア
 */
export function LogCleaner() {
  const lastClearTime = useRef<number>(0);
  const clearCount = useRef<number>(0);

  useEffect(() => {
    // 開発環境でのみ実行
    if (process.env.NODE_ENV === "development") {
      // ログクリア関数（デバウンス機能付き）
      const clearLogs = () => {
        const now = Date.now();
        // 前回のクリアから1秒以上経過している場合のみ実行
        if (now - lastClearTime.current > 1000) {
          lastClearTime.current = now;
          clearCount.current++;

          // Next.jsのAPIルートを使用
          fetch("/api/clear-logs", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.success) {
                console.log(
                  `[LogCleaner] Logs cleared (${clearCount.current}回目)`,
                );
              }
            })
            .catch((error) => {
              console.error("[LogCleaner] Failed to clear logs:", error);
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
  });

  // 開発環境でのみレンダリング回数を追跡
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[LogCleaner] Component rendered/updated");
    }
  });

  return null; // UIは表示しない
}

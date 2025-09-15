"use client";

import { useEffect } from "react";

/**
 * 開発用ログクリア機能
 * ページリロード時に自動でサーバーログをクリア
 */
export function LogCleaner() {
  useEffect(() => {
    // 開発環境でのみ実行
    if (process.env.NODE_ENV === "development") {
      // ページロード時にログをクリア
      fetch("http://localhost:7594/dev/clear-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }).catch(() => {
        // エラーは無視（サーバーが起動していない場合など）
      });
    }
  }, []);

  return null; // UIは表示しない
}

// ブラウザのコンソールログをサーバーに送信してbrowser.logに記録
(function () {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  // 重複排除用のキャッシュ
  const logCache = new Map();
  const CACHE_SIZE = 100; // 最大100件のログをキャッシュ
  const DEDUPE_WINDOW = 5000; // 5秒以内の同じログは重複とみなす

  function sendLogToServer(level, args) {
    const message = args
      .map((arg) => {
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(" ");

    // 不要なログをフィルタリング（開発用メッセージのみ）
    if (
      message.includes("[Fast Refresh]") ||
      message.includes("Clerk has been loaded with development keys") ||
      message.includes("Download the React DevTools")
    ) {
      return; // 開発用ログはスキップ
    }

    // 重複チェック用のキー（メッセージ内容のみ）
    const cacheKey = `${level}:${message}`;
    const now = Date.now();

    // 同じメッセージが最近送信されていないかチェック
    if (logCache.has(cacheKey)) {
      const lastSent = logCache.get(cacheKey);
      if (now - lastSent < DEDUPE_WINDOW) {
        return; // 重複なのでスキップ
      }
    }

    // キャッシュを更新
    logCache.set(cacheKey, now);

    // キャッシュサイズ制限
    if (logCache.size > CACHE_SIZE) {
      const oldestKey = logCache.keys().next().value;
      logCache.delete(oldestKey);
    }

    const logData = {
      level: level,
      message: message,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    // サーバーにログを送信（非同期、エラーは無視）
    fetch("/api/browser-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(logData),
    }).catch(() => {}); // エラーは無視
  }

  // コンソールメソッドをオーバーライド
  console.log = function (...args) {
    originalConsole.log.apply(console, args);
    sendLogToServer("log", args);
  };

  console.error = function (...args) {
    originalConsole.error.apply(console, args);
    sendLogToServer("error", args);
  };

  console.warn = function (...args) {
    originalConsole.warn.apply(console, args);
    sendLogToServer("warn", args);
  };

  console.info = function (...args) {
    originalConsole.info.apply(console, args);
    sendLogToServer("info", args);
  };
})();

import { exec } from "child_process";
import http from "http";

const checkReady = async (): Promise<void> => {
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      http
        .get("http://localhost:3000", (res) => {
          if (res.statusCode && res.statusCode < 500) {
            clearInterval(interval);
            resolve();
          }
        })
        .on("error", () => {});
    }, 1000);
  });
};

(async () => {
  console.log("🔍 Webサーバー起動を待機中...");
  await checkReady();
  console.log("✅ Webサーバー起動確認！他のタスクを実行します");

  exec("pnpm --filter api dev", { cwd: "./" });
  exec("pnpm --filter api db:studio", { cwd: "./" });
})();

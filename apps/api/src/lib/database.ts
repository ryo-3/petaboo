// 環境に応じたデータベース接続を提供する共通モジュール
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleSQLite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import type { Context } from "hono";
import type { Env } from "../../worker-d1";

// Cloudflare Workers環境かどうかを判定
export function isCloudflareWorkers(c?: Context<{ Bindings: Env }>) {
  return c?.env?.DB !== undefined;
}

// データベース接続を取得
export function getDatabase(c?: Context<{ Bindings: Env }>) {
  if (isCloudflareWorkers(c)) {
    // Cloudflare Workers + D1の場合
    return drizzleD1(c!.env.DB);
  } else {
    // ローカル開発環境の場合（better-sqlite3）
    const sqlite = new Database("sqlite.db");
    return drizzleSQLite(sqlite);
  }
}

// 型定義
export type DB = ReturnType<typeof getDatabase>;

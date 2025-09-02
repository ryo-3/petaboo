// Cloudflare D1データベース用のヘルパー
import { drizzle } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";

export function getDb(d1: D1Database) {
  return drizzle(d1);
}

export type DB = ReturnType<typeof getDb>;

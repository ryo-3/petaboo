import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { DrizzleD1Database } from "drizzle-orm/d1";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./index";

export type AppD1Database = DrizzleD1Database<typeof schema>;
export type AppSQLiteDatabase = BetterSQLite3Database<typeof schema>;
export type DatabaseConnection = AppD1Database | AppSQLiteDatabase;

export function createD1Database(d1: D1Database): AppD1Database {
  return drizzleD1(d1, { schema });
}

export function createSQLiteDatabase(): AppSQLiteDatabase {
  const sqlite = new Database("sqlite.db");
  return drizzleSqlite(sqlite, { schema });
}

// 環境に応じてデータベース接続を選択
export function createDatabase(d1?: D1Database): DatabaseConnection {
  if (d1) {
    return createD1Database(d1);
  } else {
    return createSQLiteDatabase();
  }
}

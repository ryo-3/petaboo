import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./index";

export type AppD1Database = DrizzleD1Database<typeof schema>;
export type DatabaseConnection = AppD1Database;

export function createD1Database(d1: D1Database): AppD1Database {
  return drizzleD1(d1, { schema });
}

// D1データベース接続のみ
export function createDatabase(d1: D1Database): DatabaseConnection {
  return createD1Database(d1);
}

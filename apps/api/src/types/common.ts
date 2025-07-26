import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { Hono } from "hono";
import * as schema from "../db";

export type DatabaseType = BetterSQLite3Database<typeof schema>;

export interface AppEnv {
  Bindings: {
    db: DatabaseType;
  };
}
import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { createAPI } from "./api";

// SQLite & drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const boardsRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
boardsRoute.use('*', clerkMiddleware());

// データベースをコンテキストに注入
boardsRoute.use('*', async (c, next) => {
  c.env = { db };
  await next();
});

const api = createAPI(boardsRoute);

export default api;
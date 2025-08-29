import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { createAPI } from "./api";

// SQLite & drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const boardCategoriesRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
boardCategoriesRoute.use(
  "*",
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  }),
);

// データベースをコンテキストに注入
boardCategoriesRoute.use("*", async (c, next) => {
  c.env = { db };
  await next();
});

const api = createAPI(boardCategoriesRoute);

export default api;

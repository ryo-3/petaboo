import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { getUserInfoRoute, getUserInfo } from "./api";

// SQLite & drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const usersRoute = new OpenAPIHono();

// データベースをコンテキストに設定
usersRoute.use("*", async (c, next) => {
  c.env = { ...c.env, db };
  await next();
});

// Clerk認証ミドルウェアを適用
usersRoute.use("*", clerkMiddleware());

// ルート定義を登録
usersRoute.openapi(getUserInfoRoute, getUserInfo);

export default usersRoute;
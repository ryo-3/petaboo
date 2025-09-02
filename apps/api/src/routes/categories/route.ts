import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { createAPI } from "./api";

// SQLite & drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const categoriesRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
categoriesRoute.use(
  "*",
  clerkMiddleware({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  }),
);

// データベースをコンテキストに注入
categoriesRoute.use("*", async (c, next) => {
  c.env = { db };
  await next();
});

const api = createAPI(categoriesRoute);

export default api;

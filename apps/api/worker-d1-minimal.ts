/// <reference types="@cloudflare/workers-types" />

import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  DB: D1Database;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  RESEND_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS設定（本番環境用）
app.use(
  "*",
  cors({
    origin: [
      "https://petaboo.vercel.app",
      "https://petaboo-git-main-moricrew.vercel.app",
      "https://petaboo-*.vercel.app",
      "http://localhost:7593",
    ], // 本番・プレビュー・開発ドメイン
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

// 基本ルート
app.get("/", (c) => {
  return c.json({
    message: "Petaboo API is running on Cloudflare Workers with D1!",
    timestamp: new Date().toISOString(),
    environment: "production",
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: "production",
  });
});

// テスト用エンドポイント（D1接続確認）
app.get("/test/db", async (c) => {
  try {
    // D1データベースへの簡単なクエリ
    const result = await c.env.DB.prepare("SELECT 1 as test").first();
    return c.json({
      success: true,
      message: "D1 database connection successful",
      result,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        message: "D1 database connection failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

export default app;

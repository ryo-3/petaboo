/// <reference types="@cloudflare/workers-types" />

import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  DB: D1Database;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  RESEND_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS設定
app.use(
  "*",
  cors({
    origin: [
      "https://note-one-tan.vercel.app", // 現在のVercel URL
      "https://petaboo.vercel.app", // 将来のURL（プロジェクト名変更後）
      "http://localhost:7593", // 開発用
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// 動作確認用のルート
app.get("/", (c) => {
  return c.json({
    message: "ぺたぼー (PETABoo) API is running on Cloudflare Workers!",
    timestamp: new Date().toISOString(),
    environment: "production",
  });
});

// 環境変数確認用（開発確認後は削除）
app.get("/health", async (c) => {
  return c.json({
    database: c.env.DB ? "D1 Connected" : "No DB",
    clerk: c.env.CLERK_SECRET_KEY ? "Clerk Configured" : "No Clerk",
    timestamp: new Date().toISOString(),
  });
});

// 基本的なAPIエンドポイント
app.get("/memos", async (c) => {
  try {
    const stmt = c.env.DB.prepare("SELECT COUNT(*) as count FROM memos");
    const result = await stmt.first();
    return c.json({
      message: "Memos endpoint working",
      count: result?.count || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Database error", details: error.message }, 500);
  }
});

app.get("/boards", async (c) => {
  try {
    const stmt = c.env.DB.prepare("SELECT COUNT(*) as count FROM boards");
    const result = await stmt.first();
    return c.json({
      message: "Boards endpoint working",
      count: result?.count || 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json({ error: "Database error", details: error.message }, 500);
  }
});

app.get("/users/me", async (c) => {
  return c.json({
    message: "Users endpoint working (auth needed)",
    timestamp: new Date().toISOString(),
  });
});

export default app;

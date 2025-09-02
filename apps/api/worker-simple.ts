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

// CORS設定（本番環境用）
app.use(
  "*",
  cors({
    origin: ["https://petaboo.vercel.app", "http://localhost:7593"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

// 認証ミドルウェア（Clerk JWT検証簡易版）
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header("Authorization");

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // 簡単な検証（実際の本番ではClerk JWT検証が必要）
    if (token && token.length > 10) {
      c.set("userId", "user_2z0DUpwFMhf1Lk6prAP9MzVJZIh");
      c.set("authenticated", true);
    }
  }

  await next();
};

// リクエストログミドルウェア
app.use("*", async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;

  console.log(`[${new Date().toISOString()}] ${method} ${url}`);

  await next();

  const duration = Date.now() - start;
  console.log(
    `[${new Date().toISOString()}] ${method} ${url} - ${c.res.status} (${duration}ms)`,
  );
});

// 基本ルート
app.get("/", (c) => {
  return c.json({
    message: "Petaboo API is running on Cloudflare Workers with D1!",
    timestamp: new Date().toISOString(),
    environment: "production",
    version: "2.1",
  });
});

app.get("/health", async (c) => {
  try {
    const db = c.env.DB;
    // シンプルなヘルスチェック
    const result = await db.prepare("SELECT 1").first();

    return c.json({
      status: "healthy",
      database: "D1 Connected",
      clerk: c.env.CLERK_SECRET_KEY ? "Configured" : "Missing",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        status: "error",
        error: error.message,
      },
      500,
    );
  }
});

// メモ一覧
app.get("/memos", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const result = await db
      .prepare(
        "SELECT * FROM memos WHERE userId = ? ORDER BY createdAt DESC LIMIT 50",
      )
      .bind(c.get("userId"))
      .all();

    return c.json(result.results || []);
  } catch (error) {
    return c.json(
      { error: "Failed to fetch memos", details: error.message },
      500,
    );
  }
});

// メモ作成
app.post("/memos", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const db = c.env.DB;
    const userId = c.get("userId");
    const now = Math.floor(Date.now() / 1000);

    const result = await db
      .prepare(
        `
      INSERT INTO memos (title, content, userId, originalId, uuid, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .bind(
        body.title,
        body.content || "",
        userId,
        now.toString(),
        crypto.randomUUID(),
        now,
        now,
      )
      .run();

    return c.json({
      success: true,
      id: result.meta.last_row_id,
      originalId: now.toString(),
    });
  } catch (error) {
    return c.json(
      { error: "Failed to create memo", details: error.message },
      500,
    );
  }
});

// メモ更新
app.put("/memos/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const db = c.env.DB;
    const userId = c.get("userId");
    const now = Math.floor(Date.now() / 1000);

    await db
      .prepare(
        `
      UPDATE memos 
      SET title = ?, content = ?, updatedAt = ?
      WHERE id = ? AND userId = ?
    `,
      )
      .bind(body.title, body.content || "", now, id, userId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { error: "Failed to update memo", details: error.message },
      500,
    );
  }
});

// メモ削除
app.delete("/memos/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const db = c.env.DB;
    const userId = c.get("userId");

    await db
      .prepare("DELETE FROM memos WHERE id = ? AND userId = ?")
      .bind(id, userId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    return c.json(
      { error: "Failed to delete memo", details: error.message },
      500,
    );
  }
});

// タスク一覧
app.get("/tasks", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const result = await db
      .prepare(
        "SELECT * FROM tasks WHERE userId = ? ORDER BY createdAt DESC LIMIT 50",
      )
      .bind(c.get("userId"))
      .all();

    return c.json(result.results || []);
  } catch (error) {
    return c.json(
      { error: "Failed to fetch tasks", details: error.message },
      500,
    );
  }
});

// タスク作成
app.post("/tasks", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const db = c.env.DB;
    const userId = c.get("userId");
    const now = Math.floor(Date.now() / 1000);

    const result = await db
      .prepare(
        `
      INSERT INTO tasks (title, content, status, userId, originalId, uuid, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .bind(
        body.title,
        body.content || "",
        body.status || "pending",
        userId,
        now.toString(),
        crypto.randomUUID(),
        now,
        now,
      )
      .run();

    return c.json({
      success: true,
      id: result.meta.last_row_id,
      originalId: now.toString(),
    });
  } catch (error) {
    return c.json(
      { error: "Failed to create task", details: error.message },
      500,
    );
  }
});

// ボード一覧
app.get("/boards", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const status = c.req.query("status") || "normal";

    let query = "SELECT * FROM boards WHERE userId = ?";
    const params = [c.get("userId")];

    if (status === "completed") {
      query += " AND completed = 1";
    } else if (status === "normal") {
      query += " AND completed = 0";
    }

    query += " ORDER BY createdAt DESC";

    const result = await db
      .prepare(query)
      .bind(...params)
      .all();
    return c.json(result.results || []);
  } catch (error) {
    return c.json(
      { error: "Failed to fetch boards", details: error.message },
      500,
    );
  }
});

// カテゴリ一覧
app.get("/categories", authMiddleware, async (c) => {
  try {
    const db = c.env.DB;
    const result = await db
      .prepare("SELECT * FROM categories WHERE userId = ? ORDER BY name")
      .bind(c.get("userId"))
      .all();

    return c.json(result.results || []);
  } catch (error) {
    return c.json(
      { error: "Failed to fetch categories", details: error.message },
      500,
    );
  }
});

// 削除されたメモ一覧（空の配列を返す簡易版）
app.get("/memos/deleted", authMiddleware, async (c) => {
  return c.json([]);
});

// タグ一覧（空の配列を返す簡易版）
app.get("/tags", authMiddleware, async (c) => {
  return c.json([]);
});

// タギング一覧（空の配列を返す簡易版）
app.get("/taggings", authMiddleware, async (c) => {
  return c.json([]);
});

// ボード全アイテム（空の配列を返す簡易版）
app.get("/boards/all-items", authMiddleware, async (c) => {
  return c.json([]);
});

// OpenAPI仕様
app.get("/openapi", (c) => {
  const openapi = {
    openapi: "3.1.0",
    info: {
      title: "Petaboo API",
      version: "2.1.0",
      description: "Petaboo本番API - Cloudflare Workers + D1（軽量版）",
    },
    paths: {
      "/": {
        get: {
          summary: "API基本情報",
          responses: {
            "200": { description: "成功" },
          },
        },
      },
      "/health": {
        get: {
          summary: "ヘルスチェック",
          responses: {
            "200": { description: "正常" },
          },
        },
      },
      "/memos": {
        get: {
          summary: "メモ一覧取得",
          responses: {
            "200": { description: "メモ一覧" },
          },
        },
        post: {
          summary: "メモ作成",
          responses: {
            "200": { description: "作成成功" },
          },
        },
      },
      "/tasks": {
        get: {
          summary: "タスク一覧取得",
          responses: {
            "200": { description: "タスク一覧" },
          },
        },
        post: {
          summary: "タスク作成",
          responses: {
            "200": { description: "作成成功" },
          },
        },
      },
      "/boards": {
        get: {
          summary: "ボード一覧取得",
          responses: {
            "200": { description: "ボード一覧" },
          },
        },
      },
      "/categories": {
        get: {
          summary: "カテゴリ一覧取得",
          responses: {
            "200": { description: "カテゴリ一覧" },
          },
        },
      },
    },
  };

  return c.json(openapi);
});

// Swagger UI
app.get("/docs", swaggerUI({ url: "/openapi" }));

export default app;

/// <reference types="@cloudflare/workers-types" />

import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "./src/db/index";

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
    origin: "*", // 開発中は一時的に全て許可
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

// データベースミドルウェア
app.use("*", async (c, next) => {
  const db = drizzle(c.env.DB, { schema });
  c.set("db", db);
  await next();
});

// 認証ミドルウェア（シンプル版）
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header("Authorization");
  console.log("Auth middleware:", {
    authHeader: authHeader ? "present" : "missing",
  });

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    console.log("Token:", token.substring(0, 20) + "...");
    // 簡単な検証（本来はClerk JWTを適切に検証）
    if (token && token.length > 10) {
      c.set("userId", "user_2z0DUpwFMhf1Lk6prAP9MzVJZIh"); // テスト用
      c.set("authenticated", true);
      console.log("User authenticated");
    }
  }

  await next();
};

// 基本的なヘルスチェック
app.get("/", (c) => {
  return c.json({
    message: "Petaboo API is running on Cloudflare Workers with D1!",
    timestamp: new Date().toISOString(),
    environment: "production",
  });
});

// データベース接続確認
app.get("/health", async (c) => {
  try {
    const db = c.get("db");
    const result = await db.select().from(schema.users).limit(1);

    return c.json({
      database: "D1 Connected",
      clerk: c.env.CLERK_SECRET_KEY ? "Clerk Configured" : "No Clerk",
      userCount: result.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return c.json(
      {
        error: "Database connection failed",
        details: error.message,
      },
      500,
    );
  }
});

// ユーザー情報取得エンドポイント
app.get("/users/me", async (c) => {
  return c.json({
    message: "Users endpoint working (auth needed)",
    timestamp: new Date().toISOString(),
  });
});

// ユーザー設定エンドポイント
app.get("/user-preferences/:userId", async (c) => {
  try {
    const userId = parseInt(c.req.param("userId"));
    const db = c.get("db");

    const preferences = await db
      .select()
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, userId))
      .limit(1);

    if (preferences.length === 0) {
      // デフォルト設定を返す
      return c.json({
        userId,
        memoColumnCount: 4,
        taskColumnCount: 2,
        memoViewMode: "list",
        taskViewMode: "list",
        memoHideControls: false,
        taskHideControls: false,
        hideHeader: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return c.json(preferences[0]);
  } catch (error) {
    return c.json(
      { error: "Failed to fetch user preferences", details: error.message },
      500,
    );
  }
});

// ボード一覧エンドポイント
app.get("/boards", authMiddleware, async (c) => {
  try {
    const status = c.req.query("status") || "normal";
    const userId = c.get("userId");
    const db = c.get("db");

    const conditions = [];

    // ユーザーでフィルタリング
    if (userId) {
      conditions.push(eq(schema.boards.userId, userId));
    }

    // ステータスでフィルタリング
    if (status === "completed") {
      conditions.push(eq(schema.boards.completed, true));
    } else if (status === "deleted") {
      // 削除済みボードの処理（実装必要）
      return c.json([]);
    } else {
      conditions.push(eq(schema.boards.completed, false));
    }

    let query = db.select().from(schema.boards);
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const boards = await query;

    return c.json(boards);
  } catch (error) {
    return c.json(
      { error: "Failed to fetch boards", details: error.message },
      500,
    );
  }
});

// メモ一覧エンドポイント
app.get("/memos", authMiddleware, async (c) => {
  try {
    const db = c.get("db");
    const memos = await db.select().from(schema.memos).limit(50);

    return c.json(memos);
  } catch (error) {
    return c.json(
      { error: "Failed to fetch memos", details: error.message },
      500,
    );
  }
});

// メモ作成エンドポイント
app.post("/memos", authMiddleware, async (c) => {
  try {
    const body = await c.req.json();
    const db = c.get("db");
    const userId = c.get("userId");

    const result = await db
      .insert(schema.memos)
      .values({
        title: body.title,
        content: body.content,
        userId: userId,
        originalId: Date.now().toString(), // 一時的な実装
        uuid: crypto.randomUUID(),
        createdAt: Math.floor(Date.now() / 1000),
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .returning();

    return c.json(result[0]);
  } catch (error) {
    return c.json(
      { error: "Failed to create memo", details: error.message },
      500,
    );
  }
});

// メモ更新エンドポイント
app.put("/memos/:id", authMiddleware, async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const body = await c.req.json();
    const db = c.get("db");

    const result = await db
      .update(schema.memos)
      .set({
        title: body.title,
        content: body.content,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(schema.memos.id, id));

    return c.json({ success: true, id });
  } catch (error) {
    return c.json(
      { error: "Failed to update memo", details: error.message },
      500,
    );
  }
});

// 削除メモ一覧エンドポイント
app.get("/memos/deleted", authMiddleware, async (c) => {
  try {
    return c.json([]); // 一時的に空配列を返す
  } catch (error) {
    return c.json(
      { error: "Failed to fetch deleted memos", details: error.message },
      500,
    );
  }
});

// タスク一覧エンドポイント
app.get("/tasks", authMiddleware, async (c) => {
  try {
    const db = c.get("db");
    const tasks = await db.select().from(schema.tasks).limit(50);

    return c.json(tasks);
  } catch (error) {
    return c.json(
      { error: "Failed to fetch tasks", details: error.message },
      500,
    );
  }
});

// タグ一覧エンドポイント
app.get("/tags", authMiddleware, async (c) => {
  try {
    return c.json([]); // 一時的に空配列を返す
  } catch (error) {
    return c.json(
      { error: "Failed to fetch tags", details: error.message },
      500,
    );
  }
});

// タギング一覧エンドポイント
app.get("/taggings", authMiddleware, async (c) => {
  try {
    return c.json([]); // 一時的に空配列を返す
  } catch (error) {
    return c.json(
      { error: "Failed to fetch taggings", details: error.message },
      500,
    );
  }
});

// ボード全アイテム取得エンドポイント
app.get("/boards/all-items", authMiddleware, async (c) => {
  try {
    return c.json([]); // 一時的に空配列を返す
  } catch (error) {
    return c.json(
      { error: "Failed to fetch board items", details: error.message },
      500,
    );
  }
});

// OpenAPI UI
app.get("/ui", swaggerUI({ url: "/openapi" }));

export default app;

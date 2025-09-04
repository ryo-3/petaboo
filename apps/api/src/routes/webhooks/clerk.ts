import { Hono } from "hono";
import { users } from "../../db";
import type { DatabaseType } from "../../types/common";

const clerkWebhook = new Hono();

// Clerkからのwebhook受信
clerkWebhook.post("/user-created", async (c) => {
  try {
    const body = await c.req.json();

    // Clerkのuser.created イベント
    if (body.type === "user.created") {
      const userId = body.data.id;
      const now = Math.floor(Date.now() / 1000);

      const db: DatabaseType = c.env.db;

      // usersテーブルに追加
      await db.insert(users).values({
        userId,
        planType: "free", // デフォルトは無料プラン
        createdAt: now,
        updatedAt: now,
      });

    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Webhook処理エラー:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default clerkWebhook;

import { createRoute, z } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@hono/clerk-auth";
import { boardSlackConfigs } from "../../../db/schema/team/board-slack-configs";
import { teamBoards } from "../../../db/schema/team/boards";
import { teamMembers } from "../../../db";
import {
  sendSlackNotification,
  formatTestNotification,
} from "../../../utils/slack-notifier";
import {
  encryptWebhookUrl,
  decryptWebhookUrl,
  hasEncryptionKey,
} from "../../../utils/encryption";
import type { OpenAPIHono } from "@hono/zod-openapi";

// Slack設定スキーマ
const BoardSlackConfigSchema = z.object({
  id: z.number(),
  boardId: z.number(),
  webhookUrl: z.string(),
  isEnabled: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const BoardSlackConfigInputSchema = z.object({
  webhookUrl: z
    .string()
    .url("有効なURLを入力してください")
    .regex(
      /^https:\/\/hooks\.slack\.com\/services\//,
      "Slack Webhook URLの形式が正しくありません",
    ),
  isEnabled: z.boolean().optional().default(true),
});

// ボード所有チームのメンバー確認
async function checkBoardTeamMember(boardId: number, userId: string, db: any) {
  // ボード情報取得
  const boards = await db
    .select()
    .from(teamBoards)
    .where(eq(teamBoards.id, boardId))
    .limit(1);

  if (boards.length === 0) return null;

  const board = boards[0];

  // チームメンバー確認
  const member = await db
    .select()
    .from(teamMembers)
    .where(
      and(eq(teamMembers.teamId, board.teamId), eq(teamMembers.userId, userId)),
    )
    .limit(1);

  return member.length > 0 ? { member: member[0], board } : null;
}

// ボード所有チームの管理者確認
async function checkBoardTeamAdmin(boardId: number, userId: string, db: any) {
  const result = await checkBoardTeamMember(boardId, userId, db);
  if (!result) return false;
  const { member } = result;
  return member.role === "admin" || member.role === "owner";
}

// GET /boards/{boardId}/slack-config（ボードSlack設定取得）
export const getBoardSlackConfigRoute = createRoute({
  method: "get",
  path: "/{boardId}/slack-config",
  request: {
    params: z.object({
      boardId: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: "Board Slack configuration",
      content: {
        "application/json": {
          schema: BoardSlackConfigSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    403: {
      description: "Not a team member",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    404: {
      description: "Slack configuration not found",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const getBoardSlackConfig = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { boardId } = c.req.valid("param");

  // ボード所有チームのメンバー確認
  const result = await checkBoardTeamMember(boardId, auth.userId, db);
  if (!result) {
    return c.json({ error: "Not a team member" }, 403);
  }

  // Slack設定取得
  const config = await db
    .select()
    .from(boardSlackConfigs)
    .where(eq(boardSlackConfigs.boardId, boardId))
    .limit(1);

  if (config.length === 0) {
    return c.json({ error: "Slack configuration not found" }, 404);
  }

  // Webhook URLを復号化してマスク表示
  const encryptionKey = c.env?.ENCRYPTION_KEY;
  let webhookUrl = config[0].webhookUrl;

  if (encryptionKey && hasEncryptionKey(c.env)) {
    try {
      webhookUrl = await decryptWebhookUrl(webhookUrl, encryptionKey);
    } catch (error) {
      console.error("復号化エラー:", error);
      console.log("⚠️ 復号化失敗 - 平文として扱います");
    }
  }

  // Webhook URLをマスク表示
  const maskedUrl = webhookUrl.replace(
    /(https:\/\/hooks\.slack\.com\/services\/[^\/]+\/[^\/]+\/).+/,
    "$1***********",
  );

  return c.json({ ...config[0], webhookUrl: maskedUrl }, 200);
};

// PUT /boards/{boardId}/slack-config（ボードSlack設定登録・更新）
export const upsertBoardSlackConfigRoute = createRoute({
  method: "put",
  path: "/{boardId}/slack-config",
  request: {
    params: z.object({
      boardId: z.string().regex(/^\d+$/).transform(Number),
    }),
    body: {
      content: {
        "application/json": {
          schema: BoardSlackConfigInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Board Slack configuration updated",
      content: {
        "application/json": {
          schema: BoardSlackConfigSchema,
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    403: {
      description: "Not an admin",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const upsertBoardSlackConfig = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { boardId } = c.req.valid("param");
  const { webhookUrl, isEnabled } = c.req.valid("json");

  // ボード所有チームの管理者確認
  const isAdmin = await checkBoardTeamAdmin(boardId, auth.userId, db);
  if (!isAdmin) {
    return c.json({ error: "Only team admins can configure Slack" }, 403);
  }

  // Webhook URLを暗号化
  const encryptionKey = c.env?.ENCRYPTION_KEY;
  let encryptedUrl = webhookUrl;

  if (encryptionKey && hasEncryptionKey(c.env)) {
    try {
      encryptedUrl = await encryptWebhookUrl(webhookUrl, encryptionKey);
      console.log("🔒 Webhook URL暗号化完了");
    } catch (error) {
      console.error("暗号化エラー:", error);
      return c.json({ error: "Failed to encrypt webhook URL" }, 500);
    }
  }

  // 既存設定確認
  const existingConfig = await db
    .select()
    .from(boardSlackConfigs)
    .where(eq(boardSlackConfigs.boardId, boardId))
    .limit(1);

  const now = Date.now();

  if (existingConfig.length > 0) {
    // 更新
    const result = await db
      .update(boardSlackConfigs)
      .set({
        webhookUrl: encryptedUrl,
        isEnabled: isEnabled ?? true,
        updatedAt: now,
      })
      .where(eq(boardSlackConfigs.boardId, boardId))
      .returning();

    // 復号化してマスク表示
    let maskedUrl = webhookUrl;
    if (encryptionKey && hasEncryptionKey(c.env)) {
      maskedUrl = webhookUrl.replace(
        /(https:\/\/hooks\.slack\.com\/services\/[^\/]+\/[^\/]+\/).+/,
        "$1***********",
      );
    }

    return c.json({ ...result[0], webhookUrl: maskedUrl }, 200);
  } else {
    // 新規作成
    const result = await db
      .insert(boardSlackConfigs)
      .values({
        boardId,
        webhookUrl: encryptedUrl,
        isEnabled: isEnabled ?? true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // 復号化してマスク表示
    let maskedUrl = webhookUrl;
    if (encryptionKey && hasEncryptionKey(c.env)) {
      maskedUrl = webhookUrl.replace(
        /(https:\/\/hooks\.slack\.com\/services\/[^\/]+\/[^\/]+\/).+/,
        "$1***********",
      );
    }

    return c.json({ ...result[0], webhookUrl: maskedUrl }, 200);
  }
};

// DELETE /boards/{boardId}/slack-config（ボードSlack設定削除）
export const deleteBoardSlackConfigRoute = createRoute({
  method: "delete",
  path: "/{boardId}/slack-config",
  request: {
    params: z.object({
      boardId: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    204: {
      description: "Board Slack configuration deleted successfully",
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    403: {
      description: "Not an admin",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const deleteBoardSlackConfig = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { boardId } = c.req.valid("param");

  // ボード所有チームの管理者確認
  const isAdmin = await checkBoardTeamAdmin(boardId, auth.userId, db);
  if (!isAdmin) {
    return c.json({ error: "Only team admins can delete Slack config" }, 403);
  }

  // 削除
  await db
    .delete(boardSlackConfigs)
    .where(eq(boardSlackConfigs.boardId, boardId));

  return c.body(null, 204);
};

// POST /boards/{boardId}/slack-config/test（テスト通知送信）
export const testBoardSlackConfigRoute = createRoute({
  method: "post",
  path: "/{boardId}/slack-config/test",
  request: {
    params: z.object({
      boardId: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: "Test notification sent successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean(), message: z.string() }),
        },
      },
    },
    401: {
      description: "Unauthorized",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    403: {
      description: "Not an admin",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    404: {
      description: "Slack configuration not found",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
    500: {
      description: "Failed to send test notification",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const testBoardSlackConfig = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { boardId } = c.req.valid("param");

  // ボード所有チームの管理者確認
  const result = await checkBoardTeamMember(boardId, auth.userId, db);
  if (!result) {
    return c.json({ error: "Not a team member" }, 403);
  }

  const { member, board } = result;
  const isAdmin = member.role === "admin" || member.role === "owner";
  if (!isAdmin) {
    return c.json({ error: "Only team admins can test Slack config" }, 403);
  }

  // Slack設定取得
  const config = await db
    .select()
    .from(boardSlackConfigs)
    .where(eq(boardSlackConfigs.boardId, boardId))
    .limit(1);

  if (config.length === 0) {
    return c.json({ error: "Slack configuration not found" }, 404);
  }

  // Webhook URLを復号化
  const encryptionKey = c.env?.ENCRYPTION_KEY;
  let webhookUrl = config[0].webhookUrl;

  if (encryptionKey && hasEncryptionKey(c.env)) {
    try {
      webhookUrl = await decryptWebhookUrl(webhookUrl, encryptionKey);
    } catch (error) {
      console.error("復号化エラー:", error);
      return c.json({ error: "Failed to decrypt webhook URL" }, 500);
    }
  }

  // テスト通知送信
  const testMessage = formatTestNotification(board.name);
  const sendResult = await sendSlackNotification(webhookUrl, testMessage);

  if (sendResult.success) {
    return c.json({ success: true, message: "テスト通知を送信しました" }, 200);
  } else {
    return c.json(
      { error: `テスト通知の送信に失敗しました: ${sendResult.error}` },
      500,
    );
  }
};

export function createAPI(app: OpenAPIHono) {
  app.openapi(getBoardSlackConfigRoute, getBoardSlackConfig);
  app.openapi(upsertBoardSlackConfigRoute, upsertBoardSlackConfig);
  app.openapi(deleteBoardSlackConfigRoute, deleteBoardSlackConfig);
  app.openapi(testBoardSlackConfigRoute, testBoardSlackConfig);

  return app;
}

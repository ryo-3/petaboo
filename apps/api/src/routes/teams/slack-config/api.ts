import { createRoute, z } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
import { getAuth } from "@hono/clerk-auth";
import { teamSlackConfigs } from "../../../db/schema/team/slack-configs";
import { teams, teamMembers } from "../../../db";
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
const SlackConfigSchema = z.object({
  id: z.number(),
  teamId: z.number(),
  webhookUrl: z.string(),
  isEnabled: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const SlackConfigInputSchema = z.object({
  webhookUrl: z
    .string()
    .url("有効なURLを入力してください")
    .regex(
      /^https:\/\/hooks\.slack\.com\/services\//,
      "Slack Webhook URLの形式が正しくありません",
    )
    .optional(), // webhookUrl変更なしの場合は省略可能
  isEnabled: z.boolean().optional().default(true),
});

// チームメンバー確認のヘルパー関数
async function checkTeamMember(teamId: number, userId: string, db: any) {
  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);

  return member.length > 0 ? member[0] : null;
}

// チーム管理者確認のヘルパー関数
async function checkTeamAdmin(teamId: number, userId: string, db: any) {
  const member = await checkTeamMember(teamId, userId, db);
  return member && (member.role === "admin" || member.role === "owner");
}

// GET /teams/{teamId}/slack-config（Slack設定取得）
export const getSlackConfigRoute = createRoute({
  method: "get",
  path: "/{teamId}/slack-config",
  request: {
    params: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: "Slack configuration",
      content: {
        "application/json": {
          schema: SlackConfigSchema,
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

export const getSlackConfig = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId } = c.req.valid("param");

  // チームメンバー確認
  const member = await checkTeamMember(teamId, auth.userId, db);
  if (!member) {
    return c.json({ error: "Not a team member" }, 403);
  }

  // Slack設定取得
  const config = await db
    .select()
    .from(teamSlackConfigs)
    .where(eq(teamSlackConfigs.teamId, teamId))
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
      // 復号化失敗時は暗号化されていない可能性（後方互換性）
    }
  }

  // Webhook URLをマスク表示（セキュリティ対策）
  // 例: https://hooks.slack.com/services/T04P4J908RK/B09EZ8N4X7F/***********
  const maskedUrl = webhookUrl.replace(
    /(https:\/\/hooks\.slack\.com\/services\/[^\/]+\/[^\/]+\/).+/,
    "$1***********",
  );

  return c.json({ ...config[0], webhookUrl: maskedUrl }, 200);
};

// PUT /teams/{teamId}/slack-config（Slack設定登録・更新）
export const putSlackConfigRoute = createRoute({
  method: "put",
  path: "/{teamId}/slack-config",
  request: {
    params: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number),
    }),
    body: {
      content: {
        "application/json": {
          schema: SlackConfigInputSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Slack configuration updated",
      content: {
        "application/json": {
          schema: SlackConfigSchema,
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
      description: "Admin only",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const putSlackConfig = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId } = c.req.valid("param");

  // チーム管理者確認
  const isAdmin = await checkTeamAdmin(teamId, auth.userId, db);
  if (!isAdmin) {
    return c.json({ error: "Admin only" }, 403);
  }

  const body = c.req.valid("json");
  const { webhookUrl, isEnabled } = body;

  const now = Date.now();

  // 既存設定確認
  const existing = await db
    .select()
    .from(teamSlackConfigs)
    .where(eq(teamSlackConfigs.teamId, teamId))
    .limit(1);

  let result;
  let encryptedWebhookUrl: string | undefined = undefined;

  // webhookUrlが提供された場合のみ暗号化処理
  if (webhookUrl) {
    const encryptionKey = c.env?.ENCRYPTION_KEY;
    if (encryptionKey && hasEncryptionKey(c.env)) {
      try {
        encryptedWebhookUrl = await encryptWebhookUrl(
          webhookUrl,
          encryptionKey,
        );
      } catch (error) {
        console.error("暗号化エラー:", error);
        return c.json({ error: "Failed to encrypt webhook URL" }, 500);
      }
    } else {
      encryptedWebhookUrl = webhookUrl; // 暗号化キーがない場合は平文
    }
  }

  if (existing.length > 0) {
    // 更新
    const updateData: any = {
      isEnabled,
      updatedAt: now,
    };

    // webhookUrlが提供された場合のみ更新
    if (encryptedWebhookUrl) {
      updateData.webhookUrl = encryptedWebhookUrl;
    }

    result = await db
      .update(teamSlackConfigs)
      .set(updateData)
      .where(eq(teamSlackConfigs.teamId, teamId))
      .returning();
  } else {
    // 新規作成 - webhookUrlは必須
    if (!encryptedWebhookUrl) {
      return c.json(
        { error: "Webhook URL is required for new configuration" },
        400,
      );
    }

    result = await db
      .insert(teamSlackConfigs)
      .values({
        teamId,
        webhookUrl: encryptedWebhookUrl,
        isEnabled,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
  }

  // レスポンス: webhookUrlは新しく設定された場合は元の値、変更なしの場合はDBから取得してマスク表示
  let responseWebhookUrl = "";

  if (webhookUrl) {
    // 新しいwebhookUrlが設定された場合は、そのまま返す（マスクしない）
    responseWebhookUrl = webhookUrl;
  } else {
    // webhookUrl変更なしの場合は、DBから取得してマスク表示
    const encryptionKey = c.env?.ENCRYPTION_KEY;
    let dbWebhookUrl = result[0].webhookUrl;

    if (encryptionKey && hasEncryptionKey(c.env)) {
      try {
        dbWebhookUrl = await decryptWebhookUrl(dbWebhookUrl, encryptionKey);
      } catch (error) {
        console.error("復号化エラー:", error);
      }
    }

    responseWebhookUrl = dbWebhookUrl.replace(
      /(https:\/\/hooks\.slack\.com\/services\/[^\/]+\/[^\/]+\/).+/,
      "$1***********",
    );
  }

  return c.json({ ...result[0], webhookUrl: responseWebhookUrl }, 200);
};

// DELETE /teams/{teamId}/slack-config（Slack設定削除）
export const deleteSlackConfigRoute = createRoute({
  method: "delete",
  path: "/{teamId}/slack-config",
  request: {
    params: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    204: {
      description: "Slack configuration deleted",
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
      description: "Admin only",
      content: {
        "application/json": {
          schema: z.object({ error: z.string() }),
        },
      },
    },
  },
});

export const deleteSlackConfig = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId } = c.req.valid("param");

  // チーム管理者確認
  const isAdmin = await checkTeamAdmin(teamId, auth.userId, db);
  if (!isAdmin) {
    return c.json({ error: "Admin only" }, 403);
  }

  await db.delete(teamSlackConfigs).where(eq(teamSlackConfigs.teamId, teamId));

  return c.body(null, 204);
};

// POST /teams/{teamId}/slack-config/test（テスト通知送信）
export const postSlackConfigTestRoute = createRoute({
  method: "post",
  path: "/{teamId}/slack-config/test",
  request: {
    params: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: "Test notification sent",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: "Failed to send notification",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            error: z.string(),
          }),
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
      description: "Admin only",
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

export const postSlackConfigTest = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");

  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId } = c.req.valid("param");

  // チーム管理者確認
  const isAdmin = await checkTeamAdmin(teamId, auth.userId, db);
  if (!isAdmin) {
    return c.json({ error: "Admin only" }, 403);
  }

  // Slack設定取得
  const config = await db
    .select()
    .from(teamSlackConfigs)
    .where(eq(teamSlackConfigs.teamId, teamId))
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
      // 復号化失敗時は暗号化されていない可能性（後方互換性）
    }
  }

  // チーム名取得
  const team = await db
    .select()
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  const teamName = team.length > 0 ? team[0].name : "不明なチーム";

  // テスト通知送信
  const message = formatTestNotification(teamName);
  const result = await sendSlackNotification(webhookUrl, message);

  if (result.success) {
    return c.json({
      success: true,
      message: "Test notification sent successfully",
    });
  } else {
    return c.json(
      {
        success: false,
        error: result.error || "Failed to send notification",
      },
      400,
    );
  }
};

export function createAPI(app: OpenAPIHono) {
  app.openapi(getSlackConfigRoute, getSlackConfig);
  app.openapi(putSlackConfigRoute, putSlackConfig);
  app.openapi(deleteSlackConfigRoute, deleteSlackConfig);
  app.openapi(postSlackConfigTestRoute, postSlackConfigTest);

  return app;
}

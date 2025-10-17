import { createRoute, z } from "@hono/zod-openapi";
import { eq, desc, and } from "drizzle-orm";
import { getAuth } from "@hono/clerk-auth";
import { teamNotifications } from "../../db/schema/team/notifications";
import { teamMembers } from "../../db/schema/team/teams";
import type { OpenAPIHono } from "@hono/zod-openapi";

// 通知スキーマ
const NotificationSchema = z.object({
  id: z.number(),
  teamId: z.number(),
  userId: z.string(),
  type: z.string(),
  sourceType: z.string().nullable(),
  sourceId: z.number().nullable(),
  targetType: z.string().nullable(),
  targetOriginalId: z.string().nullable(),
  actorUserId: z.string().nullable(),
  actorDisplayName: z.string().nullable(),
  message: z.string().nullable(),
  isRead: z.number(),
  createdAt: z.number(),
  readAt: z.number().nullable(),
});

// GET /notifications（通知一覧取得）
export const getNotificationsRoute = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number),
      limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    }),
  },
  responses: {
    200: {
      description: "List of notifications",
      content: {
        "application/json": {
          schema: z.object({
            notifications: z.array(NotificationSchema),
            unreadCount: z.number(),
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
  },
});

export const getNotifications = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId, limit = 50 } = c.req.valid("query");

  // 通知を取得（アクター情報も含める）
  const notifications = await db
    .select({
      id: teamNotifications.id,
      teamId: teamNotifications.teamId,
      userId: teamNotifications.userId,
      type: teamNotifications.type,
      sourceType: teamNotifications.sourceType,
      sourceId: teamNotifications.sourceId,
      targetType: teamNotifications.targetType,
      targetOriginalId: teamNotifications.targetOriginalId,
      actorUserId: teamNotifications.actorUserId,
      actorDisplayName: teamMembers.displayName,
      message: teamNotifications.message,
      isRead: teamNotifications.isRead,
      createdAt: teamNotifications.createdAt,
      readAt: teamNotifications.readAt,
    })
    .from(teamNotifications)
    .leftJoin(
      teamMembers,
      and(
        eq(teamMembers.teamId, teamNotifications.teamId),
        eq(teamMembers.userId, teamNotifications.actorUserId),
      ),
    )
    .where(
      and(
        eq(teamNotifications.teamId, teamId),
        eq(teamNotifications.userId, auth.userId),
      ),
    )
    .orderBy(desc(teamNotifications.createdAt))
    .limit(limit);

  // 未読数を計算
  const unreadCount = notifications.filter(
    (n: { isRead: number }) => n.isRead === 0,
  ).length;

  return c.json({ notifications, unreadCount }, 200);
};

// PUT /notifications/:id/read（通知を既読にする）
export const markAsReadRoute = createRoute({
  method: "put",
  path: "/{id}/read",
  request: {
    params: z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: "Notification marked as read",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
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
  },
});

export const markAsRead = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { id } = c.req.valid("param");

  await db
    .update(teamNotifications)
    .set({
      isRead: 1,
      readAt: Date.now(),
    })
    .where(
      and(
        eq(teamNotifications.id, id),
        eq(teamNotifications.userId, auth.userId),
      ),
    );

  return c.json({ success: true }, 200);
};

// PUT /notifications/mark-all-read（すべて既読にする）
export const markAllAsReadRoute = createRoute({
  method: "put",
  path: "/mark-all-read",
  request: {
    query: z.object({
      teamId: z.string().regex(/^\d+$/).transform(Number),
    }),
  },
  responses: {
    200: {
      description: "All notifications marked as read",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
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
  },
});

export const markAllAsRead = async (c: any) => {
  const auth = getAuth(c);
  const db = c.get("db");
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { teamId } = c.req.valid("query");

  await db
    .update(teamNotifications)
    .set({
      isRead: 1,
      readAt: Date.now(),
    })
    .where(
      and(
        eq(teamNotifications.teamId, teamId),
        eq(teamNotifications.userId, auth.userId),
        eq(teamNotifications.isRead, 0),
      ),
    );

  return c.json({ success: true }, 200);
};

export function createAPI(app: OpenAPIHono) {
  app.openapi(getNotificationsRoute, getNotifications);
  app.openapi(markAsReadRoute, markAsRead);
  app.openapi(markAllAsReadRoute, markAllAsRead);

  return app;
}

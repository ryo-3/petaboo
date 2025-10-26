import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { desc } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
import { teamActivityLogs, teamMembers, teams } from "../../db";

// アクティビティ一覧取得ルート定義
export const getTeamActivitiesRoute = createRoute({
  method: "get",
  path: "/{customUrl}/activities",
  request: {
    params: z.object({
      customUrl: z.string(),
    }),
    query: z.object({
      limit: z.string().optional().default("20"),
    }),
  },
  responses: {
    200: {
      description: "アクティビティ一覧取得成功",
      content: {
        "application/json": {
          schema: z.array(
            z.object({
              id: z.number(),
              userId: z.string(),
              actionType: z.string(),
              targetType: z.string(),
              targetId: z.string().nullable(),
              targetTitle: z.string().nullable(),
              metadata: z.string().nullable(),
              createdAt: z.number(),
            }),
          ),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
    403: {
      description: "チームメンバーではありません",
    },
    404: {
      description: "チームが見つかりません",
    },
  },
  tags: ["Team Activities"],
});

// アクティビティ一覧取得の実装
export async function getTeamActivities(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db = c.get("db");
  const { customUrl } = c.req.param();
  const { limit } = c.req.query();

  try {
    // customUrlからチームIDを取得
    const teamResult = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .limit(1);

    if (teamResult.length === 0) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    const teamId = teamResult[0].id;

    // メンバー権限をチェック
    const memberResult = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .limit(1);

    if (memberResult.length === 0) {
      return c.json({ error: "チームメンバーではありません" }, 403);
    }

    // アクティビティログを取得
    const activities = await db
      .select()
      .from(teamActivityLogs)
      .where(eq(teamActivityLogs.teamId, teamId))
      .orderBy(desc(teamActivityLogs.createdAt))
      .limit(parseInt(limit) || 20);

    return c.json(activities);
  } catch (error) {
    console.error("アクティビティ取得エラー:", error);
    return c.json({ error: "アクティビティの取得に失敗しました" }, 500);
  }
}

import { getAuth } from "@hono/clerk-auth";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq, isNotNull } from "drizzle-orm";
import { teamInvitations, teams } from "../../db/schema/team/teams";

// チームID事前キャッシュ（軽量化用）
const teamIdCache = new Map<string, number>();

// ===========================
// シンプルな通知チェックAPI
// ===========================

export const notificationCheckRoute = createRoute({
  method: "get",
  path: "/notifications/check",
  tags: ["teams"],
  summary: "通知の存在チェック（軽量版）",
  description: "通知の有無と数をチェックする軽量なAPI",
  request: {
    query: z.object({
      types: z
        .string()
        .optional()
        .describe("チェックする通知タイプ（カンマ区切り）"),
      since: z.string().optional().describe("この時刻以降の更新のみチェック"),
      teamFilter: z
        .string()
        .optional()
        .describe("特定チームの申請のみチェック（customUrl）"),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            hasUpdates: z.boolean(),
            counts: z.object({
              teamRequests: z.number().optional(),
              myRequests: z.number().optional(),
            }),
            lastCheckedAt: z.string(),
          }),
        },
      },
      description: "通知チェック結果",
    },
    401: {
      description: "認証が必要です",
    },
  },
});

// チームIDを取得（キャッシュ付き）
async function getTeamId(db: any, customUrl: string): Promise<number | null> {
  // キャッシュ確認
  if (teamIdCache.has(customUrl)) {
    return teamIdCache.get(customUrl)!;
  }

  // DBから取得
  const result = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.customUrl, customUrl))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  const teamId = result[0].id;
  // キャッシュに保存
  teamIdCache.set(customUrl, teamId);

  return teamId;
}

export async function notificationCheck(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "認証が必要です" }, 401);
  }

  const db = c.get("db");
  const query = c.req.query();

  const typesToCheck = query.types?.split(",") || ["team_requests"];
  const teamFilter = query.teamFilter;

  try {
    if (typesToCheck.includes("team_requests") && teamFilter) {
      // 1. チームID取得（キャッシュ付き）
      const teamId = await getTeamId(db, teamFilter);

      if (teamId) {
        // 2. 超軽量な申請存在チェック
        const result = await db
          .select()
          .from(teamInvitations)
          .where(
            and(
              eq(teamInvitations.teamId, teamId),
              eq(teamInvitations.status, "pending"),
              isNotNull(teamInvitations.userId),
            ),
          );

        const count = result.length;
        const hasUpdates = count > 0;

        // デバッグログ追加
        console.log(
          `🔍 [NotificationCheck] Team: ${teamFilter} (ID: ${teamId}), Count: ${count}, hasUpdates: ${hasUpdates}`,
        );
        console.log(`🔍 [NotificationCheck] Result:`, result);

        // 直接返却で最適化
        return c.text(hasUpdates ? "1" : "0", 200);
      }
    }
  } catch (error) {
    // エラー時のみログ出力（重要なエラーは記録）
    console.error(`❌ NotificationCheck Error [${teamFilter}]:`, error);
  }

  // デフォルト: 申請なし
  return c.text("0", 200);
}

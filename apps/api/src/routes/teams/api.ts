import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and } from "drizzle-orm";
import { teams, teamMembers, users } from "../../db";
import { count } from "drizzle-orm";
import type { DatabaseType } from "../../types/common";

// チーム作成のスキーマ
const createTeamSchema = z.object({
  name: z.string().min(1, "チーム名は必須です").max(100, "チーム名は100文字以内にしてください"),
  description: z.string().max(500, "説明は500文字以内にしてください").optional(),
});

// チーム作成ルート定義
export const createTeamRoute = createRoute({
  method: "post",
  path: "/",
  request: {
    body: {
      content: {
        "application/json": {
          schema: createTeamSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "チーム作成成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            name: z.string(),
            description: z.string().nullable(),
            createdAt: z.number(),
          }),
        },
      },
    },
    400: {
      description: "バリデーションエラー",
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Teams"],
});

// 個別チーム詳細取得ルート定義
export const getTeamDetailRoute = createRoute({
  method: "get",
  path: "/{id}",
  request: {
    params: z.object({
      id: z.string().transform(Number),
    }),
  },
  responses: {
    200: {
      description: "チーム詳細取得成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            name: z.string(),
            description: z.string().nullable(),
            role: z.enum(["admin", "member"]),
            createdAt: z.number(),
            updatedAt: z.number(),
            memberCount: z.number(),
          }),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
    404: {
      description: "チームが見つかりません",
    },
  },
  tags: ["Teams"],
});

// チーム情報取得ルート定義  
export const getMyTeamRoute = createRoute({
  method: "get", 
  path: "/teams/me",
  responses: {
    200: {
      description: "チーム情報取得成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            name: z.string(),
            description: z.string().nullable(),
            role: z.enum(["admin", "member"]),
            createdAt: z.number(),
          }).nullable(),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Teams"],
});

// ユーザーが所属するチーム一覧取得ルート定義
export const getTeamsRoute = createRoute({
  method: "get",
  path: "/",
  responses: {
    200: {
      description: "チーム一覧取得成功",
      content: {
        "application/json": {
          schema: z.array(z.object({
            id: z.number(),
            name: z.string(),
            description: z.string().nullable(),
            role: z.enum(["admin", "member"]),
            memberCount: z.number(),
            createdAt: z.number(),
            updatedAt: z.number(),
          })),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Teams"],
});

// チーム参加ルート定義
export const joinTeamRoute = createRoute({
  method: "post",
  path: "/{teamId}/join",
  request: {
    params: z.object({
      teamId: z.string().transform(Number),
    }),
  },
  responses: {
    200: {
      description: "チーム参加成功",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: "参加チーム数上限に達しています",
    },
    401: {
      description: "認証が必要です",
    },
    404: {
      description: "チームが見つかりません",
    },
    409: {
      description: "既にチームに参加しています",
    },
  },
  tags: ["Teams"],
});

// ユーザーのチーム統計情報取得ルート定義
export const getUserTeamStatsRoute = createRoute({
  method: "get",
  path: "/stats",
  responses: {
    200: {
      description: "チーム統計情報取得成功",
      content: {
        "application/json": {
          schema: z.object({
            ownedTeams: z.number(),
            memberTeams: z.number(),
            maxOwnedTeams: z.number(),
            maxMemberTeams: z.number(),
          }),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Teams"],
});

// ユーザーのチーム統計情報取得の実装
export async function getUserTeamStats(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;

  try {
    // ユーザーが作成したチーム数を取得
    const ownedTeamsResult = await db
      .select({ count: count() })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(and(
        eq(teamMembers.userId, auth.userId),
        eq(teamMembers.role, "admin")
      ));

    const ownedTeamsCount = ownedTeamsResult[0]?.count || 0;

    // ユーザーが参加している全チーム数を取得
    const allTeamsResult = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.userId, auth.userId));

    const allTeamsCount = allTeamsResult[0]?.count || 0;
    
    // メンバーとして参加しているチーム数（作成したチーム以外）
    const memberTeamsCount = allTeamsCount - ownedTeamsCount;

    // プレミアムプランの制限値
    const maxOwnedTeams = 3;
    const maxMemberTeams = 3;

    return c.json({
      ownedTeams: ownedTeamsCount,
      memberTeams: memberTeamsCount,
      maxOwnedTeams,
      maxMemberTeams,
    });

  } catch (error) {
    console.error("チーム統計情報取得エラー:", error);
    return c.json({ error: "チーム統計情報の取得に失敗しました" }, 500);
  }
}

// チーム作成の実装
export async function createTeam(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;
  const body = await c.req.json();
  
  try {
    // ユーザーのプランをチェック
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.userId, auth.userId))
      .limit(1);
    
    let userPlan = 'free';
    if (userResult.length > 0) {
      userPlan = userResult[0].planType;
    } else {
      // ユーザーが存在しない場合は作成（デフォルト: free）
      const now = Math.floor(Date.now() / 1000);
      await db.insert(users).values({
        userId: auth.userId,
        planType: 'free',
        createdAt: now,
        updatedAt: now,
      });
    }

    // 無料ユーザーはチーム作成不可
    if (userPlan === 'free') {
      return c.json({ error: "チーム作成には有料プランが必要です" }, 403);
    }

    // プレミアムユーザーのチーム作成数制限チェック
    const ownedTeamsResult = await db
      .select({ count: count() })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(and(
        eq(teamMembers.userId, auth.userId),
        eq(teamMembers.role, "admin")
      ));

    const ownedTeamsCount = ownedTeamsResult[0]?.count || 0;

    if (ownedTeamsCount >= 3) {
      return c.json({ error: "チーム作成数の上限に達しています（プレミアムプランは3チームまで）" }, 403);
    }

    const { name, description } = createTeamSchema.parse(body);
    const now = Math.floor(Date.now() / 1000);

    // チーム作成
    const teamResult = await db
      .insert(teams)
      .values({
        name,
        description: description || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const newTeam = teamResult[0];

    // 作成者を管理者として追加
    await db.insert(teamMembers).values({
      teamId: newTeam.id,
      userId: auth.userId,
      role: "admin",
      joinedAt: now,
    });

    return c.json({
      id: newTeam.id,
      name: newTeam.name,
      description: newTeam.description,
      createdAt: newTeam.createdAt,
    }, 201);

  } catch (error) {
    console.error("チーム作成エラー:", error);
    return c.json({ error: "チーム作成に失敗しました" }, 500);
  }
}

// チーム情報取得の実装
export async function getMyTeam(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;

  try {
    // ユーザーが所属するチームを取得
    const result = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        role: teamMembers.role,
        createdAt: teams.createdAt,
      })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, auth.userId))
      .limit(1);

    if (result.length === 0) {
      return c.json(null, 200);
    }

    return c.json(result[0], 200);

  } catch (error) {
    console.error("チーム情報取得エラー:", error);
    return c.json({ error: "チーム情報の取得に失敗しました" }, 500);
  }
}

// 個別チーム詳細取得の実装
export async function getTeamDetail(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const teamId = parseInt(c.req.param("id"));
  const db: DatabaseType = c.env.db;

  console.log("チーム詳細取得リクエスト:", { teamId, userId: auth.userId });

  try {
    // ユーザーがそのチームに所属しているかチェック
    const teamMember = await db
      .select({
        teamId: teamMembers.teamId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, auth.userId)
      ))
      .limit(1);

    if (teamMember.length === 0) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    // チーム詳細情報を取得
    const teamResult = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (teamResult.length === 0) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    const team = teamResult[0];

    // メンバー数を取得
    const memberCountResult = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    const memberCount = memberCountResult[0]?.count || 0;

    return c.json({
      id: team.id,
      name: team.name,
      description: team.description,
      role: teamMember[0].role,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
      memberCount,
    }, 200);

  } catch (error) {
    console.error("チーム詳細取得エラー:", error);
    return c.json({ error: "チーム詳細の取得に失敗しました" }, 500);
  }
}

// ユーザーが所属するチーム一覧取得の実装
export async function getTeams(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const db: DatabaseType = c.env.db;

  try {
    // ユーザーが所属するチーム一覧を取得
    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        role: teamMembers.role,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teamMembers.userId, auth.userId))
      .orderBy(teams.createdAt);

    // 各チームのメンバー数を取得
    const teamsWithMemberCount = await Promise.all(
      userTeams.map(async (team) => {
        const memberCountResult = await db
          .select({ count: count() })
          .from(teamMembers)
          .where(eq(teamMembers.teamId, team.id));

        return {
          ...team,
          memberCount: memberCountResult[0]?.count || 0,
        };
      })
    );

    return c.json(teamsWithMemberCount, 200);

  } catch (error) {
    console.error("チーム一覧取得エラー:", error);
    return c.json({ error: "チーム一覧の取得に失敗しました" }, 500);
  }
}

// チーム参加の実装
export async function joinTeam(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const { teamId } = c.req.param();
  const db: DatabaseType = c.env.db;

  try {
    // チームが存在するかチェック
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);

    if (team.length === 0) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    // 既に参加しているかチェック
    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, auth.userId)
      ))
      .limit(1);

    if (existingMember.length > 0) {
      return c.json({ error: "既にチームに参加しています" }, 409);
    }

    // ユーザーのプランをチェック
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.userId, auth.userId))
      .limit(1);
    
    let userPlan = 'free';
    if (userResult.length > 0) {
      userPlan = userResult[0].planType;
    } else {
      // ユーザーが存在しない場合は作成（デフォルト: free）
      const now = Math.floor(Date.now() / 1000);
      await db.insert(users).values({
        userId: auth.userId,
        planType: 'free',
        createdAt: now,
        updatedAt: now,
      });
    }

    // 無料ユーザーの参加チーム数制限（3チームまで）
    if (userPlan === 'free') {
      const userTeamCount = await db
        .select({ count: count() })
        .from(teamMembers)
        .where(eq(teamMembers.userId, auth.userId));

      if (userTeamCount[0].count >= 3) {
        return c.json({ error: "参加チーム数の上限に達しています（無料プランは3チームまで）" }, 400);
      }
    }
    // 有料ユーザーは制限なし

    // チームに参加
    const now = Math.floor(Date.now() / 1000);
    await db.insert(teamMembers).values({
      teamId,
      userId: auth.userId,
      role: "member",
      joinedAt: now,
    });

    return c.json({ message: "チームに参加しました" }, 200);

  } catch (error) {
    console.error("チーム参加エラー:", error);
    return c.json({ error: "チーム参加に失敗しました" }, 500);
  }
}
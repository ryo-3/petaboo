import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, sql, desc, ne } from "drizzle-orm";
import { teams, teamMembers, teamInvitations, users } from "../../db";
import { count } from "drizzle-orm";
import type { DatabaseType } from "../../types/common";

// チーム作成のスキーマ
const createTeamSchema = z.object({
  name: z
    .string()
    .min(1, "チーム名は必須です")
    .max(100, "チーム名は100文字以内にしてください"),
  description: z
    .string()
    .max(500, "説明は500文字以内にしてください")
    .optional(),
  customUrl: z
    .string()
    .min(1, "チームURLは必須です")
    .max(30, "チームURLは30文字以内にしてください")
    .regex(
      /^[a-z0-9-]+$/,
      "チームURLは英小文字・数字・ハイフンのみ使用できます",
    )
    .refine(
      (url) =>
        ![
          "admin",
          "api",
          "auth",
          "team",
          "teams",
          "user",
          "users",
          "settings",
          "help",
          "about",
          "contact",
        ].includes(url),
      "このURLは予約されているため使用できません",
    ),
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
            customUrl: z.string(),
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
  path: "/{customUrl}",
  request: {
    params: z.object({
      customUrl: z.string(),
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
            customUrl: z.string(),
            role: z.enum(["admin", "member"]),
            createdAt: z.number(),
            updatedAt: z.number(),
            memberCount: z.number(),
            members: z.array(
              z.object({
                userId: z.string(),
                displayName: z.string().nullable(),
                role: z.enum(["admin", "member"]),
                joinedAt: z.number(),
              }),
            ),
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
          schema: z
            .object({
              id: z.number(),
              name: z.string(),
              description: z.string().nullable(),
              role: z.enum(["admin", "member"]),
              createdAt: z.number(),
            })
            .nullable(),
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
          schema: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
              description: z.string().nullable(),
              customUrl: z.string(),
              role: z.enum(["admin", "member"]),
              memberCount: z.number(),
              createdAt: z.number(),
              updatedAt: z.number(),
            }),
          ),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
  },
  tags: ["Teams"],
});

// チーム招待送信ルート定義
export const inviteToTeamRoute = createRoute({
  method: "post",
  path: "/{customUrl}/invite",
  request: {
    params: z.object({
      customUrl: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: z.object({
            email: z.string().email("有効なメールアドレスを入力してください"),
            role: z.enum(["admin", "member"]).default("member"),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: "招待送信成功",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            invitationId: z.number(),
          }),
        },
      },
    },
    400: {
      description: "バリデーションエラーまたは既に招待済み",
    },
    401: {
      description: "認証が必要です",
    },
    403: {
      description: "管理者権限が必要です",
    },
    404: {
      description: "チームが見つかりません",
    },
  },
  tags: ["Teams"],
});

// 招待情報取得ルート定義
export const getInvitationRoute = createRoute({
  method: "get",
  path: "/invite/{token}",
  request: {
    params: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      description: "招待情報取得成功",
      content: {
        "application/json": {
          schema: z.object({
            id: z.number(),
            teamName: z.string(),
            inviterEmail: z.string(),
            role: z.enum(["admin", "member"]),
            expiresAt: z.number(),
          }),
        },
      },
    },
    404: {
      description: "招待が見つかりません",
    },
  },
  tags: ["Teams"],
});

// 招待受諾ルート定義
export const acceptInvitationRoute = createRoute({
  method: "post",
  path: "/invite/{token}/accept",
  request: {
    params: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      description: "チーム参加成功",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            teamId: z.number(),
          }),
        },
      },
    },
    400: {
      description: "参加チーム数上限に達しています",
    },
    404: {
      description: "招待が見つかりません",
    },
    409: {
      description: "既にチームに参加しています",
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
  request: {
    query: z.object({
      type: z.enum(["general", "my-requests"]).optional(),
    }),
  },
  responses: {
    200: {
      description: "チーム統計情報取得成功",
      content: {
        "application/json": {
          schema: z.union([
            z.object({
              ownedTeams: z.number(),
              memberTeams: z.number(),
              maxOwnedTeams: z.number(),
              maxMemberTeams: z.number(),
            }),
            z.object({
              requests: z.array(
                z.object({
                  id: z.number(),
                  teamName: z.string(),
                  teamCustomUrl: z.string(),
                  displayName: z.string().nullable(),
                  status: z.enum(["pending", "approved", "rejected"]),
                  createdAt: z.number(),
                  processedAt: z.number().nullable(),
                  message: z.string().nullable(),
                }),
              ),
            }),
          ]),
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

  const db: DatabaseType = c.get("db");

  try {
    // ユーザーが作成したチーム数を取得
    const ownedTeamsResult = await db
      .select({ count: count() })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(
        and(eq(teamMembers.userId, auth.userId), eq(teamMembers.role, "admin")),
      );

    const ownedTeamsCount = ownedTeamsResult[0]?.count || 0;

    // ユーザーが参加している全チーム数を取得（管理者・メンバー両方含む）
    const allTeamsResult = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.userId, auth.userId));

    const allTeamsCount = allTeamsResult[0]?.count || 0;

    // プレミアムプランの制限値
    const maxOwnedTeams = 3;
    const maxMemberTeams = 3;

    return c.json({
      ownedTeams: ownedTeamsCount,
      memberTeams: allTeamsCount, // 全チーム数を返す（管理者・メンバー両方含む）
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

  const db: DatabaseType = c.get("db");
  const body = await c.req.json();

  try {
    // ユーザーのプランをチェック
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.userId, auth.userId))
      .limit(1);

    let userPlan = "free";
    if (userResult.length > 0) {
      userPlan = userResult[0].planType;
    } else {
      // ユーザーが存在しない場合は作成（デフォルト: free）
      const now = Math.floor(Date.now() / 1000);
      await db.insert(users).values({
        userId: auth.userId,
        planType: "free",
        createdAt: now,
        updatedAt: now,
      });
    }

    // 無料ユーザーはチーム作成不可
    if (userPlan === "free") {
      return c.json({ error: "チーム作成には有料プランが必要です" }, 403);
    }

    // プレミアムユーザーのチーム作成数制限チェック
    const ownedTeamsResult = await db
      .select({ count: count() })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(
        and(eq(teamMembers.userId, auth.userId), eq(teamMembers.role, "admin")),
      );

    const ownedTeamsCount = ownedTeamsResult[0]?.count || 0;

    if (ownedTeamsCount >= 3) {
      return c.json(
        {
          error:
            "チーム作成数の上限に達しています（プレミアムプランは3チームまで）",
        },
        403,
      );
    }

    const { name, description, customUrl } = createTeamSchema.parse(body);
    const now = Math.floor(Date.now() / 1000);

    // customURLの重複チェック
    const existingTeam = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .limit(1);

    if (existingTeam.length > 0) {
      return c.json({ error: "このURLは既に使用されています" }, 400);
    }

    // チーム作成
    const teamResult = await db
      .insert(teams)
      .values({
        name,
        description: description || null,
        customUrl,
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

    return c.json(
      {
        id: newTeam.id,
        name: newTeam.name,
        description: newTeam.description,
        customUrl: newTeam.customUrl,
        createdAt: newTeam.createdAt,
      },
      201,
    );
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

  const db: DatabaseType = c.get("db");

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

  const customUrl = c.req.param("customUrl");
  const db: DatabaseType = c.get("db");

  try {
    // customUrlからチームIDを取得
    const teamResult = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .limit(1);

    if (teamResult.length === 0) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    const team = teamResult[0];
    const teamId = team.id;

    // ユーザーがそのチームに所属しているかチェック
    const teamMember = await db
      .select({
        teamId: teamMembers.teamId,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .limit(1);

    if (teamMember.length === 0) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    // メンバー数を取得
    const memberCountResult = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));

    const memberCount = memberCountResult[0]?.count || 0;

    // メンバー一覧を取得
    const membersResult = await db
      .select({
        userId: teamMembers.userId,
        displayName: users.displayName,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.userId))
      .where(eq(teamMembers.teamId, teamId))
      .orderBy(teamMembers.joinedAt);

    return c.json(
      {
        id: team.id,
        name: team.name,
        description: team.description,
        customUrl: team.customUrl,
        role: teamMember[0].role,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
        memberCount,
        members: membersResult,
      },
      200,
    );
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

  const db: DatabaseType = c.get("db");

  try {
    // ユーザーが所属するチーム一覧を取得
    const userTeams = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        customUrl: teams.customUrl,
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
      }),
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
  const db: DatabaseType = c.get("db");

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
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, auth.userId),
        ),
      )
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

    let userPlan = "free";
    if (userResult.length > 0) {
      userPlan = userResult[0].planType;
    } else {
      // ユーザーが存在しない場合は作成（デフォルト: free）
      const now = Math.floor(Date.now() / 1000);
      await db.insert(users).values({
        userId: auth.userId,
        planType: "free",
        createdAt: now,
        updatedAt: now,
      });
    }

    // 無料ユーザーの参加チーム数制限（3チームまで）
    if (userPlan === "free") {
      const userTeamCount = await db
        .select({ count: count() })
        .from(teamMembers)
        .where(eq(teamMembers.userId, auth.userId));

      if (userTeamCount[0].count >= 3) {
        return c.json(
          {
            error:
              "参加チーム数の上限に達しています（無料プランは3チームまで）",
          },
          400,
        );
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

// チーム招待送信の実装
export async function inviteToTeam(c: any) {
  const customUrl = c.req.param("customUrl");

  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "認証が必要です" }, 401);
  }

  const requestBody = await c.req.json();
  const { email } = requestBody;
  const role = "member"; // 招待経由は常にmember権限で参加
  const db: DatabaseType = c.get("db");

  try {
    // customUrlからチームIDを取得
    const teamResult = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .limit(1);

    if (teamResult.length === 0) {
      return c.json({ error: "チームが見つかりません" }, 404);
    }

    const team = teamResult[0];
    const teamId = team.id;

    // ユーザーがそのチームの管理者かチェック
    const teamMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, auth.userId),
          eq(teamMembers.role, "admin"),
        ),
      )
      .limit(1);

    if (teamMember.length === 0) {
      return c.json({ error: "管理者権限が必要です" }, 403);
    }

    // 既に招待済みかチェック
    const existingInvitation = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.teamId, teamId),
          eq(teamInvitations.email, email),
          eq(teamInvitations.status, "pending"),
        ),
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return c.json(
        { error: "このメールアドレスには既に招待を送信済みです" },
        400,
      );
    }

    // 既にチームメンバーかチェック（メールアドレスでユーザー検索は今回はスキップ）

    // 招待トークンを生成（簡単な実装）
    const token =
      Math.random().toString(36).substring(2) + Date.now().toString(36);
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + 7 * 24 * 60 * 60; // 7日後

    // 招待をDBに保存（roleカラム削除済み）
    const invitation = await db
      .insert(teamInvitations)
      .values({
        teamId,
        email,
        token,
        invitedBy: auth.userId,
        createdAt: now,
        expiresAt,
        status: "pending",
      })
      .returning();

    // メール送信（失敗しても続行）
    const baseUrl =
      process.env.NODE_ENV === "production"
        ? "https://petaboo.vercel.app"
        : "http://localhost:7593";
    const invitationLink = `${baseUrl}/team/join/${token}`;

    try {
      const { sendTeamInvitationEmail } = await import(
        "../../services/email.js"
      );
      const emailResult = await sendTeamInvitationEmail({
        to: email,
        teamName: team[0].name,
        inviterEmail: auth.userId,
        role: "member", // 招待経由は常にmember権限
        invitationToken: token,
        invitationLink,
      });
    } catch (error) {
      console.error("メール送信でエラー:", error);
    }

    return c.json(
      {
        message: "招待を送信しました",
        invitationId: invitation[0].id,
        invitationLink,
      },
      201,
    );
  } catch (error) {
    console.error("チーム招待エラー:", error);
    return c.json({ error: "招待送信に失敗しました" }, 500);
  }
}

// 招待情報取得の実装
export async function getInvitation(c: any) {
  const token = c.req.param("token");
  const db: DatabaseType = c.get("db");

  try {
    // 招待情報を取得
    const invitation = await db
      .select({
        id: teamInvitations.id,
        teamId: teamInvitations.teamId,
        email: teamInvitations.email,
        invitedBy: teamInvitations.invitedBy,
        expiresAt: teamInvitations.expiresAt,
        status: teamInvitations.status,
        teamName: teams.name,
      })
      .from(teamInvitations)
      .innerJoin(teams, eq(teamInvitations.teamId, teams.id))
      .where(
        and(
          eq(teamInvitations.token, token),
          eq(teamInvitations.status, "pending"),
        ),
      )
      .get();

    if (!invitation) {
      return c.json({ message: "招待が見つかりません" }, 404);
    }

    // 期限チェック
    const now = Math.floor(Date.now() / 1000);
    if (invitation.expiresAt < now) {
      // 期限切れの場合はレコードを削除
      await db.delete(teamInvitations).where(eq(teamInvitations.token, token));

      return c.json({ message: "招待の期限が切れています" }, 404);
    }

    return c.json({
      id: invitation.teamId,
      teamName: invitation.teamName,
      inviterEmail: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
    });
  } catch (error) {
    console.error("招待情報取得エラー:", error);
    return c.json({ message: "招待情報の取得に失敗しました" }, 500);
  }
}

// 招待受諾の実装
export async function acceptInvitation(c: any) {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ message: "認証が必要です" }, 401);
  }

  const token = c.req.param("token");
  const db: DatabaseType = c.get("db");

  try {
    // 招待情報を取得
    const invitation = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.token, token),
          eq(teamInvitations.status, "pending"),
        ),
      )
      .get();

    if (!invitation) {
      return c.json({ message: "招待が見つかりません" }, 404);
    }

    // 期限チェック
    const now = Math.floor(Date.now() / 1000);
    if (invitation.expiresAt < now) {
      // 期限切れの場合はレコードを削除
      await db.delete(teamInvitations).where(eq(teamInvitations.token, token));

      return c.json({ message: "招待の期限が切れています" }, 404);
    }

    // 既にチームメンバーかチェック
    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, invitation.teamId),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .get();

    if (existingMember) {
      return c.json({ message: "既にこのチームに参加しています" }, 409);
    }

    // プレミアムプラン制限チェック
    const memberTeamsCount = await db
      .select({ count: sql`count(*)`.as("count") })
      .from(teamMembers)
      .where(eq(teamMembers.userId, auth.userId))
      .get();

    const MAX_MEMBER_TEAMS = 3;
    if (memberTeamsCount && memberTeamsCount.count >= MAX_MEMBER_TEAMS) {
      return c.json({ message: "参加できるチーム数の上限に達しています" }, 400);
    }

    // チームメンバーとして追加（常にmember権限で参加）
    await db.insert(teamMembers).values({
      teamId: invitation.teamId,
      userId: auth.userId,
      role: "member", // 招待経由は常にmemberで参加
      joinedAt: Math.floor(Date.now() / 1000),
    });

    // 招待ステータスを受諾済みに更新
    await db
      .update(teamInvitations)
      .set({ status: "accepted" })
      .where(eq(teamInvitations.token, token));

    return c.json({
      message: "チームに参加しました",
      teamId: invitation.teamId,
    });
  } catch (error) {
    console.error("招待受諾エラー:", error);
    return c.json({ message: "チームへの参加に失敗しました" }, 500);
  }
}

// 既存の招待URL取得ルート定義
export const getInviteUrlRoute = createRoute({
  method: "get",
  path: "/{customUrl}/invite-url",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z
            .object({
              token: z.string(),
              url: z.string(),
              expiresAt: z.string(),
              createdAt: z.string(),
            })
            .nullable(),
        },
      },
      description: "招待URL取得成功",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "権限エラー",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "チームが見つからない",
    },
  },
  tags: ["teams"],
});

// 招待URL削除ルート定義
export const deleteInviteUrlRoute = createRoute({
  method: "delete",
  path: "/{customUrl}/invite-url",
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "招待URL削除成功",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "権限エラー",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "チームが見つからない",
    },
  },
  tags: ["teams"],
});

// 招待URL生成のスキーマ
const generateInviteUrlSchema = z.object({
  expiresInDays: z.number().min(1).max(30).default(3), // 1-30日、デフォルト3日
  // roleは常にmemberに固定（後でメンバー一覧で変更可能）
});

// 招待URL生成ルート定義
export const generateInviteUrlRoute = createRoute({
  method: "post",
  path: "/{customUrl}/invite-url",
  request: {
    body: {
      content: {
        "application/json": {
          schema: generateInviteUrlSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            token: z.string(),
            url: z.string(),
            expiresAt: z.string(),
          }),
        },
      },
      description: "招待URL生成成功",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "バリデーションエラー",
    },
    403: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "権限エラー",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "チームが見つからない",
    },
  },
  tags: ["teams"],
});

// 招待URL生成ハンドラー
// 既存の招待URL取得の実装
export async function getInviteUrl(c: any) {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ message: "認証が必要です" }, 401);
    }

    const { customUrl } = c.req.param();
    const db: DatabaseType = c.get("db");

    // チーム存在確認
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .get();

    if (!team) {
      return c.json({ message: "チームが見つかりません" }, 404);
    }

    // 管理者権限確認
    const memberRole = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .get();

    if (!memberRole || memberRole.role !== "admin") {
      return c.json({ message: "管理者権限が必要です" }, 403);
    }

    // 既存のアクティブな招待URLを取得
    const invitation = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.teamId, team.id),
          eq(teamInvitations.email, "URL_INVITE"),
          eq(teamInvitations.status, "active"),
        ),
      )
      .get();

    if (!invitation) {
      return c.json(null);
    }

    const inviteUrl = `${process.env.NODE_ENV === "production" ? "https://petaboo.vercel.app" : "http://localhost:7593"}/join/${customUrl}?token=${invitation.token}`;

    return c.json({
      token: invitation.token,
      url: inviteUrl,
      expiresAt: new Date(invitation.expiresAt * 1000).toISOString(),
      createdAt: new Date(invitation.createdAt * 1000).toISOString(),
    });
  } catch (error) {
    console.error("招待URL取得エラー:", error);
    return c.json({ message: "招待URLの取得に失敗しました" }, 500);
  }
}

// 招待URL削除の実装
export async function deleteInviteUrl(c: any) {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ message: "認証が必要です" }, 401);
    }

    const { customUrl } = c.req.param();
    const db: DatabaseType = c.get("db");

    // チーム存在確認
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .get();

    if (!team) {
      return c.json({ message: "チームが見つかりません" }, 404);
    }

    // 管理者権限確認
    const memberRole = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .get();

    if (!memberRole || memberRole.role !== "admin") {
      return c.json({ message: "管理者権限が必要です" }, 403);
    }

    // 既存のアクティブな招待URLを削除
    await db
      .delete(teamInvitations)
      .where(
        and(
          eq(teamInvitations.teamId, team.id),
          eq(teamInvitations.email, "URL_INVITE"),
          eq(teamInvitations.status, "active"),
        ),
      );

    return c.json({ message: "招待URLを削除しました" });
  } catch (error) {
    console.error("招待URL削除エラー:", error);
    return c.json({ message: "招待URLの削除に失敗しました" }, 500);
  }
}

export async function generateInviteUrl(c: any) {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ message: "認証が必要です" }, 401);
    }

    const { customUrl } = c.req.param();
    const { expiresInDays } = await c.req.json();
    const db: DatabaseType = c.get("db");

    // チーム存在確認
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .get();

    if (!team) {
      return c.json({ message: "チームが見つかりません" }, 404);
    }

    // 管理者権限確認
    const memberRole = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .get();

    if (!memberRole || memberRole.role !== "admin") {
      return c.json({ message: "管理者権限が必要です" }, 403);
    }

    // 既存のアクティブな招待URLを削除
    await db
      .delete(teamInvitations)
      .where(
        and(
          eq(teamInvitations.teamId, team.id),
          eq(teamInvitations.email, "URL_INVITE"),
          eq(teamInvitations.status, "active"),
        ),
      );

    // 新しいトークン生成
    const token =
      Math.random().toString(36).substring(2, 12) +
      Math.random().toString(36).substring(2, 12);

    const expiresAt =
      Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;

    // 招待URL用のレコード作成（roleカラム削除済み）
    await db.insert(teamInvitations).values({
      teamId: team.id,
      email: "URL_INVITE",
      token: token,
      invitedBy: auth.userId,
      createdAt: Math.floor(Date.now() / 1000),
      expiresAt: expiresAt,
      status: "active",
    });

    const inviteUrl = `${process.env.NODE_ENV === "production" ? "https://petaboo.vercel.app" : "http://localhost:7593"}/join/${customUrl}?token=${token}`;

    return c.json({
      token: token,
      url: inviteUrl,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
    });
  } catch (error) {
    console.error("招待URL生成エラー:", error);
    return c.json({ message: "招待URLの生成に失敗しました" }, 500);
  }
}

// トークン検証・チーム情報取得ルート定義
export const verifyInviteTokenRoute = createRoute({
  method: "get",
  path: "/join/{customUrl}",
  request: {
    params: z.object({
      customUrl: z.string(),
    }),
    query: z.object({
      token: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            team: z.object({
              name: z.string(),
              description: z.string().nullable(),
              memberCount: z.number(),
            }),
            isValid: z.boolean(),
          }),
        },
      },
      description: "トークン検証成功・チーム情報取得",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "無効なトークンまたは期限切れ",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "チームが見つからない",
    },
  },
  tags: ["teams"],
});

// 参加申請送信のルート定義
export const submitJoinRequestRoute = createRoute({
  method: "post",
  path: "/join/{customUrl}",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            token: z.string(),
            displayName: z.string().optional(),
            email: z.string().email().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
            requestId: z.number(),
          }),
        },
      },
      description: "参加申請成功",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "無効なトークンまたは既にメンバー",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "認証が必要です",
    },
    404: {
      content: {
        "application/json": {
          schema: z.object({ message: z.string() }),
        },
      },
      description: "チームが見つからない",
    },
  },
  tags: ["teams"],
});

// トークン検証・チーム情報取得ハンドラー
export async function verifyInviteToken(c: any) {
  try {
    const { customUrl } = c.req.param();
    const { token } = c.req.query();
    const db: DatabaseType = c.get("db");

    if (!token) {
      return c.json({ message: "トークンが必要です" }, 400);
    }

    // チーム存在確認
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .get();

    if (!team) {
      return c.json({ message: "チームが見つかりません" }, 404);
    }

    // デバッグ: 該当チームの招待データを確認
    const allInvitations = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.teamId, team.id));

    console.log("🔍 Team ID:", team.id, "Token:", token);
    console.log("🔍 All invitations for this team:", allInvitations);

    // トークン検証
    const invitation = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.teamId, team.id),
          eq(teamInvitations.token, token),
          eq(teamInvitations.email, "URL_INVITE"),
          eq(teamInvitations.status, "active"),
        ),
      )
      .get();

    if (!invitation) {
      console.log("🚨 No matching invitation found");
      return c.json(
        {
          message: "無効な招待URLです",
          team: {
            name: team.name,
            description: team.description,
            memberCount: 0,
          },
          isValid: false,
        },
        400,
      );
    }

    // トークン期限確認
    const currentTime = Math.floor(Date.now() / 1000);
    if (invitation.expiresAt < currentTime) {
      return c.json(
        {
          message: "招待URLの有効期限が切れています",
          team: {
            name: team.name,
            description: team.description,
            memberCount: 0,
          },
          isValid: false,
        },
        400,
      );
    }

    // チームメンバー数取得
    const memberCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(teamMembers)
      .where(eq(teamMembers.teamId, team.id))
      .get();

    const memberCount = memberCountResult?.count || 0;

    // ユーザーの申請状態をチェック（認証されている場合のみ）
    const auth = getAuth(c);
    let applicationStatus = null;

    if (auth?.userId) {
      const existingApplication = await db
        .select()
        .from(teamInvitations)
        .where(
          and(
            eq(teamInvitations.teamId, team.id),
            eq(teamInvitations.userId, auth.userId),
            eq(teamInvitations.status, "pending"),
          ),
        )
        .get();

      if (existingApplication) {
        applicationStatus = {
          status: "pending",
          displayName: existingApplication.displayName,
          appliedAt: existingApplication.createdAt,
        };
      }

      // 既にメンバーかもチェック
      const isMember = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, team.id),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .get();

      if (isMember) {
        applicationStatus = {
          status: "member",
          role: isMember.role,
          joinedAt: isMember.joinedAt,
        };
      }
    }

    console.log("🔍 applicationStatus:", applicationStatus);

    return c.json({
      team: {
        name: team.name,
        description: team.description,
        memberCount,
      },
      isValid: true,
      applicationStatus, // 申請状態を追加
    });
  } catch (error) {
    console.error("トークン検証エラー:", error);
    return c.json({ message: "トークン検証に失敗しました" }, 500);
  }
}

// 承認待ちリスト取得ルート定義
export const getJoinRequestsRoute = createRoute({
  method: "get",
  path: "/{customUrl}/join-requests",
  request: {
    params: z.object({
      customUrl: z.string(),
    }),
  },
  responses: {
    200: {
      description: "承認待ちリスト取得成功",
      content: {
        "application/json": {
          schema: z.object({
            requests: z.array(
              z.object({
                id: z.number(),
                displayName: z.string().nullable(),
                email: z.string(),
                createdAt: z.number(),
                message: z.string().nullable(),
                userId: z.string().nullable(),
              }),
            ),
          }),
        },
      },
    },
    401: {
      description: "認証が必要です",
    },
    403: {
      description: "管理者権限が必要です",
    },
    404: {
      description: "チームが見つかりません",
    },
  },
  tags: ["Teams"],
});

// 承認待ちリスト取得ハンドラー
export async function getJoinRequests(c: any) {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ message: "認証が必要です" }, 401);
    }

    const { customUrl } = c.req.param();
    const db: DatabaseType = c.get("db");

    // チーム存在確認
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .get();

    if (!team) {
      return c.json({ message: "チームが見つかりません" }, 404);
    }

    // 管理者権限チェック
    const member = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, auth.userId),
          eq(teamMembers.role, "admin"),
        ),
      )
      .get();

    if (!member) {
      return c.json({ message: "管理者権限が必要です" }, 403);
    }

    // 承認待ちの申請を取得
    const joinRequests = await db
      .select({
        id: teamInvitations.id,
        displayName: teamInvitations.displayName,
        email: teamInvitations.email,
        createdAt: teamInvitations.createdAt,
        message: teamInvitations.message,
        userId: teamInvitations.userId,
      })
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.teamId, team.id),
          eq(teamInvitations.status, "pending"),
          ne(teamInvitations.email, "URL_INVITE"), // URL招待レコードは除外
        ),
      )
      .orderBy(desc(teamInvitations.createdAt));

    return c.json({
      requests: joinRequests,
    });
  } catch (error) {
    console.error("承認待ちリスト取得エラー:", error);
    return c.json({ message: "承認待ちリストの取得に失敗しました" }, 500);
  }
}

// 申請承認ルート定義
export const approveJoinRequestRoute = createRoute({
  method: "put",
  path: "/{customUrl}/join-requests/{requestId}/approve",
  request: {
    params: z.object({
      customUrl: z.string(),
      requestId: z.string().transform((val) => parseInt(val, 10)),
    }),
  },
  responses: {
    200: {
      description: "申請の承認に成功しました",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: "不正なリクエストです",
    },
    401: {
      description: "認証が必要です",
    },
    403: {
      description: "管理者権限が必要です",
    },
    404: {
      description: "申請が見つかりません",
    },
  },
  tags: ["Teams"],
});

// 申請拒否ルート定義
export const rejectJoinRequestRoute = createRoute({
  method: "put",
  path: "/{customUrl}/join-requests/{requestId}/reject",
  request: {
    params: z.object({
      customUrl: z.string(),
      requestId: z.string().transform((val) => parseInt(val, 10)),
    }),
  },
  responses: {
    200: {
      description: "申請の拒否に成功しました",
      content: {
        "application/json": {
          schema: z.object({
            message: z.string(),
          }),
        },
      },
    },
    400: {
      description: "不正なリクエストです",
    },
    401: {
      description: "認証が必要です",
    },
    403: {
      description: "管理者権限が必要です",
    },
    404: {
      description: "申請が見つかりません",
    },
  },
  tags: ["Teams"],
});

// 申請承認ハンドラー
export async function approveJoinRequest(c: any) {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ message: "認証が必要です" }, 401);
    }

    const { customUrl, requestId } = c.req.param();
    const db: DatabaseType = c.get("db");

    // チーム存在確認
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .get();

    if (!team) {
      return c.json({ message: "チームが見つかりません" }, 404);
    }

    // 管理者権限チェック
    const member = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .get();

    if (!member || member.role !== "admin") {
      return c.json({ message: "管理者権限が必要です" }, 403);
    }

    // 申請データ取得
    const request = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.id, requestId),
          eq(teamInvitations.teamId, team.id),
          eq(teamInvitations.status, "pending"),
        ),
      )
      .get();

    if (!request) {
      return c.json({ message: "申請が見つかりません" }, 404);
    }

    if (!request.userId) {
      return c.json({ message: "ユーザーIDが見つかりません" }, 400);
    }

    // 既にチームメンバーかチェック
    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, request.userId),
        ),
      )
      .get();

    if (existingMember) {
      return c.json({ message: "既にチームメンバーです" }, 409);
    }

    const now = Date.now();

    // トランザクション開始（SQLiteでは自動コミット）
    // 1. 申請ステータス更新
    await db
      .update(teamInvitations)
      .set({
        status: "approved",
        processedAt: now,
        processedBy: auth.userId,
      })
      .where(eq(teamInvitations.id, requestId));

    // 2. チームメンバーに追加
    await db.insert(teamMembers).values({
      teamId: team.id,
      userId: request.userId,
      role: "member",
      joinedAt: now,
    });

    // 3. ユーザーのdisplay_nameを更新（存在する場合）
    if (request.displayName) {
      // ユーザーが既に存在するかチェック
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.userId, request.userId))
        .get();

      if (existingUser) {
        // 既存ユーザーの場合は更新
        await db
          .update(users)
          .set({
            displayName: request.displayName,
            updatedAt: now,
          })
          .where(eq(users.userId, request.userId));
      } else {
        // 新規ユーザーの場合は作成
        await db.insert(users).values({
          userId: request.userId,
          displayName: request.displayName,
          planType: "free",
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return c.json({ message: "申請を承認しました" }, 200);
  } catch (error) {
    console.error("申請承認エラー:", error);
    return c.json({ message: "申請の承認に失敗しました" }, 500);
  }
}

// 申請拒否ハンドラー
export async function rejectJoinRequest(c: any) {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ message: "認証が必要です" }, 401);
    }

    const { customUrl, requestId } = c.req.param();
    const db: DatabaseType = c.get("db");

    // チーム存在確認
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .get();

    if (!team) {
      return c.json({ message: "チームが見つかりません" }, 404);
    }

    // 管理者権限チェック
    const member = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .get();

    if (!member || member.role !== "admin") {
      return c.json({ message: "管理者権限が必要です" }, 403);
    }

    // 申請データ取得
    const request = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.id, requestId),
          eq(teamInvitations.teamId, team.id),
          eq(teamInvitations.status, "pending"),
        ),
      )
      .get();

    if (!request) {
      return c.json({ message: "申請が見つかりません" }, 404);
    }

    const now = Date.now();

    // 申請ステータス更新
    await db
      .update(teamInvitations)
      .set({
        status: "rejected",
        processedAt: now,
        processedBy: auth.userId,
      })
      .where(eq(teamInvitations.id, requestId));

    return c.json({ message: "申請を拒否しました" }, 200);
  } catch (error) {
    console.error("申請拒否エラー:", error);
    return c.json({ message: "申請の拒否に失敗しました" }, 500);
  }
}

// 参加申請送信ハンドラー
export async function submitJoinRequest(c: any) {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ message: "認証が必要です" }, 401);
    }

    const { customUrl } = c.req.param();
    const { token, displayName, email } = await c.req.json();
    const db: DatabaseType = c.get("db");

    // チーム存在確認
    const team = await db
      .select()
      .from(teams)
      .where(eq(teams.customUrl, customUrl))
      .get();

    if (!team) {
      return c.json({ message: "チームが見つかりません" }, 404);
    }

    // トークン検証
    const invitation = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.teamId, team.id),
          eq(teamInvitations.token, token),
          eq(teamInvitations.email, "URL_INVITE"),
          eq(teamInvitations.status, "active"),
        ),
      )
      .get();

    if (!invitation) {
      return c.json({ message: "無効な招待URLです" }, 400);
    }

    // トークン期限確認
    const currentTime = Math.floor(Date.now() / 1000);
    if (invitation.expiresAt < currentTime) {
      return c.json({ message: "招待URLの有効期限が切れています" }, 400);
    }

    // 既にメンバーかチェック
    const existingMember = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, team.id),
          eq(teamMembers.userId, auth.userId),
        ),
      )
      .get();

    if (existingMember) {
      return c.json({ message: "既にチームのメンバーです" }, 400);
    }

    // 使用回数制限チェック
    if (invitation.usageCount >= invitation.maxUsage) {
      return c.json(
        {
          message: `この招待URLは使用上限（${invitation.maxUsage}人）に達しています`,
        },
        400,
      );
    }

    // 既存の申請をチェック（同じユーザー＋チーム＋pending状態）
    const existingApplication = await db
      .select()
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.teamId, team.id),
          eq(teamInvitations.userId, auth.userId),
          eq(teamInvitations.status, "pending"),
        ),
      )
      .get();

    if (existingApplication) {
      // 既存申請を更新（表示名とメールアドレス）
      await db
        .update(teamInvitations)
        .set({
          displayName: displayName || "未設定",
          email: email || "unknown@example.com",
          createdAt: currentTime, // 申請日時を更新
        })
        .where(eq(teamInvitations.id, existingApplication.id));

      return c.json({
        message: "参加申請を更新しました",
        requestId: existingApplication.id,
      });
    } else {
      // 新規申請作成
      const result = await db.insert(teamInvitations).values({
        teamId: team.id,
        email: email || "unknown@example.com",
        token: token, // 招待URLと同じトークンを使用
        status: "pending",
        invitedBy: "SYSTEM", // URL経由の申請
        createdAt: currentTime,
        expiresAt: currentTime + 7 * 24 * 60 * 60, // 7日後
        userId: auth.userId,
        displayName: displayName || "未設定",
      });

      // 招待URLの使用回数をインクリメント
      await db
        .update(teamInvitations)
        .set({
          usageCount: invitation.usageCount + 1,
        })
        .where(eq(teamInvitations.id, invitation.id));

      return c.json({
        message: "参加申請を送信しました",
        requestId: result.lastInsertRowid as number,
      });
    }
  } catch (error) {
    console.error("参加申請エラー:", error);
    return c.json({ message: "参加申請の送信に失敗しました" }, 500);
  }
}

// 自分の申請状況取得ルート定義
export const getMyJoinRequestsRoute = createRoute({
  method: "get",
  path: "/my-requests",
  responses: {
    200: {
      description: "自分の申請状況取得成功",
      content: {
        "application/json": {
          schema: z.object({
            requests: z.array(
              z.object({
                id: z.number(),
                teamName: z.string(),
                teamCustomUrl: z.string(),
                displayName: z.string().nullable(),
                status: z.enum(["pending", "approved", "rejected"]),
                createdAt: z.number(),
                processedAt: z.number().nullable(),
                message: z.string().nullable(),
              }),
            ),
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

// 自分の申請状況取得ハンドラー
export async function getMyJoinRequests(c: any) {
  try {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "認証が必要です" }, 401);
    }

    const db: DatabaseType = c.get("db");

    // 自分が申請したチーム参加申請を取得
    const myRequests = await db
      .select({
        id: teamInvitations.id,
        teamName: teams.name,
        teamCustomUrl: teams.customUrl,
        displayName: teamInvitations.displayName,
        status: teamInvitations.status,
        createdAt: teamInvitations.createdAt,
        processedAt: teamInvitations.processedAt,
        message: teamInvitations.message,
        email: teamInvitations.email, // デバッグ用に追加
      })
      .from(teamInvitations)
      .innerJoin(teams, eq(teamInvitations.teamId, teams.id))
      .where(
        and(
          eq(teamInvitations.userId, auth.userId),
          ne(teamInvitations.email, "URL_INVITE"), // URL招待レコードは除外
        ),
      )
      .orderBy(desc(teamInvitations.createdAt));

    return c.json({
      requests: myRequests,
    });
  } catch (error) {
    console.error("自分の申請状況取得エラー:", error);
    return c.json({ message: "申請状況の取得に失敗しました" }, 500);
  }
}

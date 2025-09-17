import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, sql, like, desc } from "drizzle-orm";
import { tags, taggings } from "../../db";
import { teamTags, teamTaggings } from "../../db/schema/team/tags";
import { teamMembers } from "../../db/schema/team/teams";
import type { NewTag } from "../../db/schema/tags";
import type { DatabaseType, Env, AppType } from "../../types/common";

const TagSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string().nullable(),
  userId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const TeamTagSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string().nullable(),
  teamId: z.number(),
  userId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const CreateTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
});

const TagStatsSchema = z.object({
  id: z.number(),
  name: z.string(),
  usageCount: z.number(),
  lastUsed: z.number().nullable(),
  itemTypes: z.object({
    memo: z.number(),
    task: z.number(),
    board: z.number(),
  }),
});

export function createAPI(app: AppType) {
  // タグ一覧取得
  const getTagsRoute = createRoute({
    method: "get",
    path: "/",
    tags: ["tags"],
    request: {
      query: z.object({
        q: z.string().optional(),
        sort: z.enum(["name", "usage", "recent"]).optional().default("name"),
        limit: z.string().optional(),
        teamId: z.string().optional(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.array(z.union([TagSchema, TeamTagSchema])),
          },
        },
        description: "Get all tags (personal or team)",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
    },
  });

  app.openapi(getTagsRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { q, sort, limit, teamId } = c.req.valid("query");
    const db = c.get("db");

    // チームIDが指定された場合はチームタグを取得
    if (teamId) {
      const teamIdNum = parseInt(teamId, 10);
      if (isNaN(teamIdNum)) {
        return c.json({ error: "Invalid teamId" }, 400);
      }

      // チームメンバー確認
      const member = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamIdNum),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (member.length === 0) {
        return c.json({ error: "Not a team member" }, 403);
      }

      // チームタグを取得
      let teamQuery = db
        .select()
        .from(teamTags)
        .where(eq(teamTags.teamId, teamIdNum));

      // 検索フィルター（チーム用）
      if (q) {
        teamQuery = teamQuery.where(
          and(eq(teamTags.teamId, teamIdNum), like(teamTags.name, `%${q}%`)),
        );
      }

      const teamTagsResult = await teamQuery.execute();
      return c.json(teamTagsResult, 200);
    }

    let query = db.select().from(tags).where(eq(tags.userId, auth.userId));

    // 検索フィルター
    if (q) {
      query = query.where(
        and(eq(tags.userId, auth.userId), like(tags.name, `%${q}%`)),
      );
    }

    // ソート順
    if (sort === "usage") {
      // 使用頻度順（サブクエリで使用回数を計算）
      const tagsWithUsage = await db
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
          userId: tags.userId,
          createdAt: tags.createdAt,
          updatedAt: tags.updatedAt,
          usageCount: sql<number>`count(${taggings.id})`,
        })
        .from(tags)
        .leftJoin(taggings, eq(tags.id, taggings.tagId))
        .where(eq(tags.userId, auth.userId))
        .groupBy(tags.id)
        .orderBy(desc(sql<number>`count(${taggings.id})`));

      const limitValue = limit ? parseInt(limit) : undefined;
      const result = limitValue
        ? tagsWithUsage.slice(0, limitValue)
        : tagsWithUsage;

      return c.json(
        result.map((item) => ({
          id: item.id,
          name: item.name,
          color: item.color,
          userId: item.userId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      );
    } else if (sort === "recent") {
      // 最近使用順
      const recentTags = await db
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
          userId: tags.userId,
          createdAt: tags.createdAt,
          updatedAt: tags.updatedAt,
          lastUsed: sql<number>`max(${taggings.createdAt})`,
        })
        .from(tags)
        .leftJoin(taggings, eq(tags.id, taggings.tagId))
        .where(eq(tags.userId, auth.userId))
        .groupBy(tags.id)
        .orderBy(desc(sql<number>`max(${taggings.createdAt})`));

      const limitValue = limit ? parseInt(limit) : undefined;
      const result = limitValue ? recentTags.slice(0, limitValue) : recentTags;

      return c.json(
        result.map((item) => ({
          id: item.id,
          name: item.name,
          color: item.color,
          userId: item.userId,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      );
    } else {
      // 名前順（デフォルト）
      query = query.orderBy(tags.name);
      if (limit) {
        query = query.limit(parseInt(limit));
      }
      const result = await query;
      return c.json(result);
    }
  });

  // タグ作成
  const createTagRoute = createRoute({
    method: "post",
    path: "/",
    tags: ["tags"],
    request: {
      query: z.object({
        teamId: z.string().optional(),
      }),
      body: {
        content: {
          "application/json": {
            schema: CreateTagSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          "application/json": {
            schema: TagSchema,
          },
        },
        description: "Tag created (personal or team)",
      },
      400: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Bad request",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      403: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not a team member",
      },
    },
  });

  app.openapi(createTagRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { name, color } = c.req.valid("json");
    const { teamId } = c.req.valid("query");
    const db = c.get("db");

    // チームタグ作成の場合
    if (teamId) {
      const teamIdNum = parseInt(teamId, 10);
      if (isNaN(teamIdNum)) {
        return c.json({ error: "Invalid teamId" }, 400);
      }

      // チームメンバー確認
      const member = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamIdNum),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (member.length === 0) {
        return c.json({ error: "Not a team member" }, 403);
      }

      // チームタグ数制限チェック（300個）
      const teamTagCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(teamTags)
        .where(eq(teamTags.teamId, teamIdNum));

      if (teamTagCount[0]?.count >= 300) {
        return c.json(
          { error: "Team tag limit reached (300 tags maximum)" },
          400,
        );
      }

      // 同名チームタグの存在チェック
      const existingTeamTag = await db
        .select()
        .from(teamTags)
        .where(and(eq(teamTags.teamId, teamIdNum), eq(teamTags.name, name)))
        .limit(1);

      if (existingTeamTag.length > 0) {
        return c.json({ error: "Team tag already exists" }, 400);
      }

      const newTeamTag = {
        name,
        color: color || null,
        teamId: teamIdNum,
        userId: auth.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.insert(teamTags).values(newTeamTag).returning();
      return c.json(result[0], 201);
    }

    // 個人タグ作成の場合（既存のロジック）
    // タグ数制限チェック（300個）
    const tagCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(tags)
      .where(eq(tags.userId, auth.userId));

    if (tagCount[0]?.count >= 300) {
      return c.json({ error: "Tag limit reached (300 tags maximum)" }, 400);
    }

    // 同名タグの存在チェック
    const existing = await db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, auth.userId), eq(tags.name, name)))
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "Tag already exists" }, 400);
    }

    const newTag: NewTag = {
      name,
      color: color || null,
      userId: auth.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.insert(tags).values(newTag).returning();
    return c.json(result[0], 201);
  });

  // タグ更新
  const updateTagRoute = createRoute({
    method: "put",
    path: "/{id}",
    tags: ["tags"],
    request: {
      params: z.object({
        id: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: CreateTagSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: TagSchema,
          },
        },
        description: "Tag updated",
      },
      400: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Bad request",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  app.openapi(updateTagRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const tagId = parseInt(c.req.param("id"));
    const { name, color } = c.req.valid("json");
    const db = c.get("db");

    // タグの所有権確認
    const tag = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, auth.userId)))
      .limit(1);

    if (tag.length === 0) {
      return c.json({ error: "Tag not found" }, 404);
    }

    // 同名タグの存在チェック（自分以外）
    const existing = await db
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.userId, auth.userId),
          eq(tags.name, name),
          sql`${tags.id} != ${tagId}`,
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      return c.json({ error: "Tag already exists" }, 400);
    }

    const updated = await db
      .update(tags)
      .set({
        name,
        color: color || null,
        updatedAt: new Date(),
      })
      .where(eq(tags.id, tagId))
      .returning();

    return c.json(updated[0]);
  });

  // タグ削除
  const deleteTagRoute = createRoute({
    method: "delete",
    path: "/{id}",
    tags: ["tags"],
    request: {
      params: z.object({
        id: z.string(),
      }),
      query: z.object({
        teamId: z.string().optional(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
        description: "Tag deleted (personal or team)",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      403: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not a team member",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  app.openapi(deleteTagRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const tagId = parseInt(c.req.param("id"));
    const { teamId } = c.req.valid("query");
    const db = c.get("db");

    // チームタグ削除の場合
    if (teamId) {
      const teamIdNum = parseInt(teamId, 10);
      if (isNaN(teamIdNum)) {
        return c.json({ error: "Invalid teamId" }, 400);
      }

      // チームメンバー確認
      const member = await db
        .select()
        .from(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamIdNum),
            eq(teamMembers.userId, auth.userId),
          ),
        )
        .limit(1);

      if (member.length === 0) {
        return c.json({ error: "Not a team member" }, 403);
      }

      // チームタグの存在確認
      const teamTag = await db
        .select()
        .from(teamTags)
        .where(and(eq(teamTags.id, tagId), eq(teamTags.teamId, teamIdNum)))
        .limit(1);

      if (teamTag.length === 0) {
        return c.json({ error: "Team tag not found" }, 404);
      }

      // チームタグを削除（関連するタグ付けもCASCADEで削除される）
      await db.delete(teamTags).where(eq(teamTags.id, tagId));

      return c.json({ success: true });
    }

    // 個人タグ削除の場合（既存のロジック）
    // タグの所有権確認
    const tag = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, auth.userId)))
      .limit(1);

    if (tag.length === 0) {
      return c.json({ error: "Tag not found" }, 404);
    }

    // タグを削除（関連するタグ付けもCASCADEで削除される）
    await db.delete(tags).where(eq(tags.id, tagId));

    return c.json({ success: true });
  });

  // タグ統計情報取得
  const getTagStatsRoute = createRoute({
    method: "get",
    path: "/{id}/stats",
    tags: ["tags"],
    request: {
      params: z.object({
        id: z.string(),
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: TagStatsSchema,
          },
        },
        description: "Tag statistics",
      },
      401: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Unauthorized",
      },
      404: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Not found",
      },
    },
  });

  app.openapi(getTagStatsRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const tagId = parseInt(c.req.param("id"));
    const db = c.get("db");

    // タグの所有権確認
    const tag = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, auth.userId)))
      .limit(1);

    if (tag.length === 0) {
      return c.json({ error: "Tag not found" }, 404);
    }

    // 各タイプ別の使用数をカウント
    const memoCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(taggings)
      .where(
        and(
          eq(taggings.tagId, tagId),
          eq(taggings.targetType, "memo"),
          eq(taggings.userId, auth.userId),
        ),
      );

    const taskCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(taggings)
      .where(
        and(
          eq(taggings.tagId, tagId),
          eq(taggings.targetType, "task"),
          eq(taggings.userId, auth.userId),
        ),
      );

    const boardCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(taggings)
      .where(
        and(
          eq(taggings.tagId, tagId),
          eq(taggings.targetType, "board"),
          eq(taggings.userId, auth.userId),
        ),
      );

    // 最後に使用された日時
    const lastUsedResult = await db
      .select({ lastUsed: sql<number>`max(${taggings.createdAt})` })
      .from(taggings)
      .where(and(eq(taggings.tagId, tagId), eq(taggings.userId, auth.userId)));

    const memoCountValue = memoCount[0]?.count || 0;
    const taskCountValue = taskCount[0]?.count || 0;
    const boardCountValue = boardCount[0]?.count || 0;

    return c.json({
      id: tagId,
      name: tag[0].name,
      usageCount: memoCountValue + taskCountValue + boardCountValue,
      lastUsed: lastUsedResult[0]?.lastUsed || null,
      itemTypes: {
        memo: memoCountValue,
        task: taskCountValue,
        board: boardCountValue,
      },
    });
  });

  return app;
}

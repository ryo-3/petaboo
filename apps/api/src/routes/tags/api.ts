import { createRoute, z } from "@hono/zod-openapi";
import { getAuth } from "@hono/clerk-auth";
import { eq, and, sql, like, desc } from "drizzle-orm";
import { tags, taggings } from "../../db";
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
      }),
    },
    responses: {
      200: {
        content: {
          "application/json": {
            schema: z.array(TagSchema),
          },
        },
        description: "Get all tags",
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

    const { q, sort, limit } = c.req.valid("query");
    const db = c.env.db;

    let query = db
      .select()
      .from(tags)
      .where(eq(tags.userId, auth.userId));

    // 検索フィルター
    if (q) {
      query = query.where(
        and(
          eq(tags.userId, auth.userId),
          like(tags.name, `%${q}%`)
        )
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
      const result = limitValue ? tagsWithUsage.slice(0, limitValue) : tagsWithUsage;
      
      return c.json(result.map(item => ({
        id: item.id,
        name: item.name,
        color: item.color,
        userId: item.userId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })));
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
      
      return c.json(result.map(item => ({
        id: item.id,
        name: item.name,
        color: item.color,
        userId: item.userId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })));
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
        description: "Tag created",
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
    },
  });

  app.openapi(createTagRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { name, color } = c.req.valid("json");
    const db = c.env.db;

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
      .where(
        and(
          eq(tags.userId, auth.userId),
          eq(tags.name, name)
        )
      )
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
    const db = c.env.db;

    // タグの所有権確認
    const tag = await db
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.id, tagId),
          eq(tags.userId, auth.userId)
        )
      )
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
          sql`${tags.id} != ${tagId}`
        )
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
        updatedAt: new Date() 
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
        description: "Tag deleted",
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

  app.openapi(deleteTagRoute, async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const tagId = parseInt(c.req.param("id"));
    const db = c.env.db;

    // タグの所有権確認
    const tag = await db
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.id, tagId),
          eq(tags.userId, auth.userId)
        )
      )
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
    const db = c.env.db;

    // タグの所有権確認
    const tag = await db
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.id, tagId),
          eq(tags.userId, auth.userId)
        )
      )
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
          eq(taggings.userId, auth.userId)
        )
      );

    const taskCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(taggings)
      .where(
        and(
          eq(taggings.tagId, tagId),
          eq(taggings.targetType, "task"),
          eq(taggings.userId, auth.userId)
        )
      );

    const boardCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(taggings)
      .where(
        and(
          eq(taggings.tagId, tagId),
          eq(taggings.targetType, "board"),
          eq(taggings.userId, auth.userId)
        )
      );

    // 最後に使用された日時
    const lastUsedResult = await db
      .select({ lastUsed: sql<number>`max(${taggings.createdAt})` })
      .from(taggings)
      .where(
        and(
          eq(taggings.tagId, tagId),
          eq(taggings.userId, auth.userId)
        )
      );

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
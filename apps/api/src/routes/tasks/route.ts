import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc, and, sql } from "drizzle-orm";
import Database from "better-sqlite3";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { tasks, deletedTasks } from "../../db/schema/tasks";
import { boardItems } from "../../db/schema/boards";
import { generateOriginalId, generateUuid } from "../../utils/originalId";

// SQLite & drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const app = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
app.use('*', clerkMiddleware());

// 共通スキーマ定義
const TaskSchema = z.object({
  id: z.number(),
  originalId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.number().nullable(),
  categoryId: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
});

const TaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "completed"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.number().optional(),
  categoryId: z.number().optional(),
});

const TaskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.number().optional(),
  categoryId: z.number().optional(),
});

// GET /tasks（OpenAPI付き）
app.openapi(
  createRoute({
    method: "get",
    path: "/",
    responses: {
      200: {
        description: "List of tasks",
        content: {
          "application/json": {
            schema: z.array(TaskSchema),
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
  }),
  // @ts-ignore OpenAPI type complexity
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const result = await db.select({
      id: tasks.id,
      originalId: tasks.originalId,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      categoryId: tasks.categoryId,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    }).from(tasks)
      .where(eq(tasks.userId, auth.userId))
      .orderBy(
        // 優先度順: high(3) > medium(2) > low(1)
        desc(
          sql`CASE 
            WHEN ${tasks.priority} = 'high' THEN 3
            WHEN ${tasks.priority} = 'medium' THEN 2  
            WHEN ${tasks.priority} = 'low' THEN 1
            ELSE 0
          END`
        ),
        desc(tasks.updatedAt), 
        desc(tasks.createdAt)
      );
    
    return c.json(result, 200);
  }
);

// POST /tasks（OpenAPI付き）
app.openapi(
  createRoute({
    method: "post",
    path: "/",
    request: {
      body: {
        content: {
          "application/json": {
            schema: TaskInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Created task",
        content: {
          "application/json": {
            schema: z.object({ 
              success: z.boolean(),
              id: z.number()
            }),
          },
        },
      },
      400: {
        description: "Invalid input",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              issues: z.any().optional(),
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
  }),
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const parsed = TaskInputSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400
      );
    }

    const { title, description, status, priority, dueDate, categoryId } = parsed.data;
    const result = await db.insert(tasks).values({
      userId: auth.userId,
      originalId: "", // 後で更新
      uuid: generateUuid(), // UUID生成
      title,
      description,
      status,
      priority,
      dueDate,
      categoryId,
      createdAt: Math.floor(Date.now() / 1000),
    }).returning({ id: tasks.id });

    // originalIdを生成して更新
    const originalId = generateOriginalId(result[0].id);
    await db.update(tasks)
      .set({ originalId })
      .where(eq(tasks.id, result[0].id));

    return c.json({ success: true, id: result[0].id as number }, 200);
  }
);

// PUT /tasks/:id（タスク更新）
app.openapi(
  createRoute({
    method: "put",
    path: "/{id}",
    request: {
      params: z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
      }),
      body: {
        content: {
          "application/json": {
            schema: TaskUpdateSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Updated task",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean() }),
          },
        },
      },
      400: {
        description: "Invalid input",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              issues: z.any().optional(),
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
      404: {
        description: "Task not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { id } = c.req.valid("param");
    const body = await c.req.json();
    const parsed = TaskUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400
      );
    }

    const updateData = {
      ...parsed.data,
      updatedAt: Math.floor(Date.now() / 1000)
    };

    const result = await db.update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, id), eq(tasks.userId, auth.userId)));

    if (result.changes === 0) {
      return c.json({ error: "Task not found" }, 404);
    }

    return c.json({ success: true }, 200);
  }
);

// DELETE /tasks/:id（OpenAPI付き）
app.openapi(
  createRoute({
    method: "delete",
    path: "/{id}",
    request: {
      params: z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
      }),
    },
    responses: {
      200: {
        description: "Task deleted successfully",
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
      404: {
        description: "Task not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { id } = c.req.valid("param");
    
    // まず該当タスクを取得（ユーザー確認込み）
    const task = await db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, auth.userId))).get();
    
    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    // トランザクションで削除済みテーブルに移動してから元テーブルから削除
    db.transaction((tx) => {
      // 削除済みテーブルに挿入
      tx.insert(deletedTasks).values({
        userId: auth.userId,
        originalId: task.originalId, // originalIdをそのままコピー
        uuid: task.uuid, // UUIDもコピー
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        categoryId: task.categoryId,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        deletedAt: Math.floor(Date.now() / 1000),
      }).run();

      // 関連するboard_itemsのdeletedAtを設定
      tx.update(boardItems)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(boardItems.itemType, 'task'),
          eq(boardItems.originalId, task.originalId)
        )).run();

      // 元テーブルから削除
      tx.delete(tasks).where(eq(tasks.id, id)).run();
    });

    return c.json({ success: true }, 200);
  }
);

// GET /deleted（削除済みタスク一覧）
app.openapi(
  createRoute({
    method: "get",
    path: "/deleted",
    responses: {
      200: {
        description: "List of deleted tasks",
        content: {
          "application/json": {
            schema: z.array(z.object({
              id: z.number(),
              originalId: z.string(),
              title: z.string(),
              description: z.string().nullable(),
              status: z.string(),
              priority: z.string(),
              dueDate: z.number().nullable(),
              createdAt: z.number(),
              updatedAt: z.number().nullable(),
              deletedAt: z.number(),
            })),
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
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  // @ts-ignore OpenAPI type complexity
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const result = await db.select({
        id: deletedTasks.id,
        originalId: deletedTasks.originalId,
        title: deletedTasks.title,
        description: deletedTasks.description,
        status: deletedTasks.status,
        priority: deletedTasks.priority,
        dueDate: deletedTasks.dueDate,
        categoryId: deletedTasks.categoryId,
        createdAt: deletedTasks.createdAt,
        updatedAt: deletedTasks.updatedAt,
        deletedAt: deletedTasks.deletedAt,
      }).from(deletedTasks)
        .where(eq(deletedTasks.userId, auth.userId))
        .orderBy(desc(deletedTasks.deletedAt));
      return c.json(result);
    } catch (error) {
      console.error('削除済みタスク取得エラー:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
);

// DELETE /deleted/:id（完全削除）
app.openapi(
  createRoute({
    method: "delete",
    path: "/deleted/{originalId}",
    request: {
      params: z.object({
        originalId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Task permanently deleted",
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
      404: {
        description: "Deleted task not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { originalId } = c.req.valid("param");
    
    try {
      const result = await db.delete(deletedTasks).where(
        and(eq(deletedTasks.originalId, originalId), eq(deletedTasks.userId, auth.userId))
      );
      
      if (result.changes === 0) {
        return c.json({ error: "Deleted task not found" }, 404);
      }

      return c.json({ success: true }, 200);
    } catch (error) {
      console.error('完全削除エラー:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
);

// POST /deleted/:originalId/restore（復元）
app.openapi(
  createRoute({
    method: "post",
    path: "/deleted/{originalId}/restore",
    request: {
      params: z.object({
        originalId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Task restored successfully",
        content: {
          "application/json": {
            schema: z.object({ success: z.boolean(), id: z.number() }),
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
      404: {
        description: "Deleted task not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { originalId } = c.req.valid("param");
    
    try {
      // まず削除済みタスクを取得
      const deletedTask = await db.select().from(deletedTasks).where(
        and(eq(deletedTasks.originalId, originalId), eq(deletedTasks.userId, auth.userId))
      ).get();
      
      if (!deletedTask) {
        return c.json({ error: "Deleted task not found" }, 404);
      }

      // トランザクションで復元処理
      const restoredTask = db.transaction((tx) => {
        // 通常のタスクテーブルに復元
        const result = tx.insert(tasks).values({
          userId: auth.userId,
          originalId: deletedTask.originalId, // originalIdをそのまま復元
          uuid: deletedTask.uuid, // UUIDも復元
          title: deletedTask.title,
          description: deletedTask.description,
          status: deletedTask.status as "todo" | "in_progress" | "completed",
          priority: deletedTask.priority as "low" | "medium" | "high",
          dueDate: deletedTask.dueDate,
          categoryId: deletedTask.categoryId,
          createdAt: deletedTask.createdAt,
          updatedAt: Math.floor(Date.now() / 1000), // 復元時刻を更新
        }).returning({ id: tasks.id }).get();

        // 関連するboard_itemsのdeletedAtをNULLに戻す
        tx.update(boardItems)
          .set({ deletedAt: null })
          .where(and(
            eq(boardItems.itemType, 'task'),
            eq(boardItems.originalId, deletedTask.originalId)
          )).run();

        // 削除済みテーブルから削除
        tx.delete(deletedTasks).where(eq(deletedTasks.originalId, originalId)).run();

        return result;
      });

      return c.json({ success: true, id: restoredTask.id as number }, 200);
    } catch (error) {
      console.error('復元エラー:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
);

export default app;
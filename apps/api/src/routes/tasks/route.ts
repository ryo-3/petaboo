import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc, and } from "drizzle-orm";
import Database from "better-sqlite3";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { tasks, deletedTasks } from "@/db/schema/tasks";

// SQLite & drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const app = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
app.use('*', clerkMiddleware());

// 共通スキーマ定義
const TaskSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
});

const TaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "completed"]).default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.number().optional(),
});

const TaskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.number().optional(),
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
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    }).from(tasks).where(eq(tasks.userId, auth.userId));
    
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

    const { title, description, status, priority, dueDate } = parsed.data;
    const result = await db.insert(tasks).values({
      userId: auth.userId,
      title,
      description,
      status,
      priority,
      dueDate,
      createdAt: Math.floor(Date.now() / 1000),
    }).returning({ id: tasks.id });

    return c.json({ success: true, id: result[0].id }, 200);
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
        originalId: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        deletedAt: Math.floor(Date.now() / 1000),
      }).run();

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
              originalId: z.number(),
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
    path: "/deleted/{id}",
    request: {
      params: z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
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

    const { id } = c.req.valid("param");
    
    try {
      const result = await db.delete(deletedTasks).where(
        and(eq(deletedTasks.id, id), eq(deletedTasks.userId, auth.userId))
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

export default app;
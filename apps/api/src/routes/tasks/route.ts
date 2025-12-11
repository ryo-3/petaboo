import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { eq, desc, and, sql, isNull, isNotNull } from "drizzle-orm";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { tasks, taskStatusHistory } from "../../db/schema/tasks";
import { boardItems } from "../../db/schema/boards";
import { taggings } from "../../db/schema/tags";
import { attachments } from "../../db/schema/attachments";
import { teamNotifications } from "../../db/schema/team/notifications";
import { databaseMiddleware } from "../../middleware/database";
import { generateOriginalId, generateUuid } from "../../utils/originalId";

const app = new OpenAPIHono<{
  Bindings: { DB: D1Database };
  Variables: { db: any };
}>();

// データベースミドルウェアを適用（最初に）
app.use("*", databaseMiddleware);

// Clerk認証ミドルウェアを追加
app.use("*", clerkMiddleware());

// 共通スキーマ定義
const TaskSchema = z.object({
  id: z.number(),
  displayId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(["todo", "in_progress", "checking", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.number().nullable(),
  categoryId: z.number().nullable(),
  boardCategoryId: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
});

const TaskInputSchema = z.object({
  title: z.string().min(1).max(200, "タイトルは200文字以内で入力してください"),
  description: z
    .string()
    .max(10000, "説明は10,000文字以内で入力してください")
    .optional(),
  status: z
    .enum(["todo", "in_progress", "checking", "completed"])
    .default("todo"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.number().optional(),
  categoryId: z.number().optional(),
  boardCategoryId: z.number().optional(),
});

const TaskUpdateSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(200, "タイトルは200文字以内で入力してください")
    .optional(),
  description: z
    .string()
    .max(10000, "説明は10,000文字以内で入力してください")
    .optional(),
  status: z.enum(["todo", "in_progress", "checking", "completed"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.number().optional(),
  categoryId: z.number().optional(),
  boardCategoryId: z.number().optional(),
});

const ImportResultSchema = z.object({
  success: z.boolean(),
  imported: z.number(),
  errors: z.array(z.string()),
});

// CSVパース関数
function parseCSV(csvText: string): {
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "checking" | "completed";
  priority?: "low" | "medium" | "high";
}[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  if (!header.includes("title")) return [];

  const results: {
    title: string;
    description?: string;
    status?: "todo" | "in_progress" | "checking" | "completed";
    priority?: "low" | "medium" | "high";
  }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 簡単なCSVパース（カンマ区切り、ダブルクォート対応）
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

    if (values.length >= 1 && values[0]) {
      const taskData: {
        title: string;
        description?: string;
        status?: "todo" | "in_progress" | "checking" | "completed";
        priority?: "low" | "medium" | "high";
      } = {
        title: values[0],
      };

      // description (2列目)
      if (values[1]) taskData.description = values[1];

      // status (3列目)
      const status = values[2]?.toLowerCase();
      if (
        status === "todo" ||
        status === "in_progress" ||
        status === "checking" ||
        status === "completed"
      ) {
        taskData.status = status;
      }

      // priority (4列目)
      const priority = values[3]?.toLowerCase();
      if (priority === "low" || priority === "medium" || priority === "high") {
        taskData.priority = priority;
      }

      results.push(taskData);
    }
  }

  return results;
}

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

    const db = c.get("db");
    const result = await db
      .select({
        id: tasks.id,
        displayId: tasks.displayId,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        categoryId: tasks.categoryId,
        boardCategoryId: tasks.boardCategoryId,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .where(and(eq(tasks.userId, auth.userId), isNull(tasks.deletedAt)))
      .orderBy(
        // 優先度順: high(3) > medium(2) > low(1)
        desc(
          sql`CASE 
            WHEN ${tasks.priority} = 'high' THEN 3
            WHEN ${tasks.priority} = 'medium' THEN 2  
            WHEN ${tasks.priority} = 'low' THEN 1
            ELSE 0
          END`,
        ),
        desc(tasks.updatedAt),
        desc(tasks.createdAt),
      );

    // IMPORTANT: displayIdを文字列型として確実に返す（Drizzleが数値に変換する場合があるため）
    const tasksWithStringDisplayId = result.map((task) => ({
      ...task,
      displayId: String(task.displayId || task.id),
    }));

    return c.json(tasksWithStringDisplayId);
  },
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
              id: z.number(),
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

    const db = c.get("db");
    const body = await c.req.json();
    const parsed = TaskInputSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400,
      );
    }

    const {
      title,
      description,
      status,
      priority,
      dueDate,
      categoryId,
      boardCategoryId,
    } = parsed.data;

    const insertData = {
      userId: auth.userId,
      displayId: "", // 後で更新
      uuid: generateUuid(), // UUID生成
      title,
      description,
      status,
      priority,
      dueDate,
      categoryId,
      boardCategoryId,
      createdAt: Math.floor(Date.now() / 1000),
    };

    const result = await db
      .insert(tasks)
      .values(insertData)
      .returning({ id: tasks.id });

    // displayId を生成して更新
    const displayId = generateOriginalId(result[0].id);
    await db.update(tasks).set({ displayId }).where(eq(tasks.id, result[0].id));

    // 作成されたタスクを取得して返す
    const newTask = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, result[0].id))
      .get();

    return c.json(newTask, 200);
  },
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

    const db = c.get("db");
    const { id } = c.req.valid("param");
    const body = await c.req.json();
    const parsed = TaskUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400,
      );
    }

    // ステータス変更履歴のため、まず既存タスクを取得
    const existingTask = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.userId, auth.userId),
          isNull(tasks.deletedAt),
        ),
      )
      .get();

    if (!existingTask) {
      return c.json({ error: "Task not found" }, 404);
    }

    const updateData = {
      ...parsed.data,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    await db
      .update(tasks)
      .set(updateData)
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.userId, auth.userId),
          isNull(tasks.deletedAt),
        ),
      );

    // ステータスが変更された場合、履歴を保存
    if (parsed.data.status && parsed.data.status !== existingTask.status) {
      await db.insert(taskStatusHistory).values({
        taskId: id,
        userId: auth.userId,
        fromStatus: existingTask.status,
        toStatus: parsed.data.status,
        changedAt: Math.floor(Date.now() / 1000),
      });
    }

    // 更新後のタスクを取得して返す
    const updatedTask = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.userId, auth.userId),
          isNull(tasks.deletedAt),
        ),
      )
      .get();

    return c.json(updatedTask || { success: true }, 200);
  },
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

    const db = c.get("db");
    const { id } = c.req.valid("param");

    // まず該当タスクを取得（ユーザー確認込み）
    const task = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, id),
          eq(tasks.userId, auth.userId),
          isNull(tasks.deletedAt),
        ),
      )
      .get();

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    try {
      // Step 1: 論理削除（deleted_atを設定）
      await db
        .update(tasks)
        .set({
          deletedAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(tasks.id, id));

      // Step 2: 関連するboard_itemsのdeletedAtを設定
      await db
        .update(boardItems)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(boardItems.itemType, "task"),
            eq(boardItems.displayId, task.displayId),
          ),
        );

      // Step 3: 関連する通知を削除
      await db
        .delete(teamNotifications)
        .where(
          and(
            eq(teamNotifications.targetType, "task"),
            eq(teamNotifications.targetDisplayId, task.displayId),
          ),
        );
    } catch (error) {
      return c.json({ error: "Failed to delete task" }, 500);
    }

    return c.json({ success: true }, 200);
  },
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
            schema: z.array(
              z.object({
                id: z.number(),
                displayId: z.string(),
                title: z.string(),
                description: z.string().nullable(),
                status: z.string(),
                priority: z.string(),
                dueDate: z.number().nullable(),
                createdAt: z.number(),
                updatedAt: z.number().nullable(),
                deletedAt: z.number(),
              }),
            ),
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

    const db = c.get("db");
    try {
      const result = await db
        .select({
          id: tasks.id,
          displayId: tasks.displayId,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          categoryId: tasks.categoryId,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          deletedAt: tasks.deletedAt,
        })
        .from(tasks)
        .where(and(eq(tasks.userId, auth.userId), isNotNull(tasks.deletedAt)))
        .orderBy(desc(tasks.deletedAt));
      return c.json(result);
    } catch (error) {
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// DELETE /deleted/:id（完全削除）
app.openapi(
  createRoute({
    method: "delete",
    path: "/deleted/{displayId}",
    request: {
      params: z.object({
        displayId: z.string(),
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

    const db = c.get("db");
    const env = c.env;
    const { displayId } = c.req.valid("param");

    try {
      // R2削除のため、トランザクション前に添付ファイル情報を取得
      const attachmentsToDelete = await db
        .select()
        .from(attachments)
        .where(
          and(
            eq(attachments.attachedTo, "task"),
            eq(attachments.displayId, displayId),
            eq(attachments.userId, auth.userId),
          ),
        );

      // R2から実ファイルを削除
      const r2Bucket = env.R2_BUCKET;
      if (r2Bucket && attachmentsToDelete.length > 0) {
        for (const attachment of attachmentsToDelete) {
          try {
            await r2Bucket.delete(attachment.r2Key);
          } catch (error) {
            console.error(`❌ [R2削除失敗] ${attachment.r2Key}`, error);
            // R2削除失敗してもDB削除は続行
          }
        }
      }

      // 1. タグ付けを削除（タグ本体は保持）
      await db
        .delete(taggings)
        .where(
          and(
            eq(taggings.targetType, "task"),
            eq(taggings.targetDisplayId, displayId),
          ),
        )
        .run();

      // 2. 添付ファイルを削除
      await db
        .delete(attachments)
        .where(
          and(
            eq(attachments.attachedTo, "task"),
            eq(attachments.displayId, displayId),
          ),
        )
        .run();

      // 3. 関連するボードアイテムは削除しない（削除済みタブで表示するため保持）

      // 4. タスクを物理削除
      const result = await db
        .delete(tasks)
        .where(
          and(
            eq(tasks.displayId, displayId),
            eq(tasks.userId, auth.userId),
            isNotNull(tasks.deletedAt), // 削除済み確認
          ),
        )
        .run();

      if (result.changes === 0) {
        return c.json({ error: "Deleted task not found" }, 404);
      }

      return c.json({ success: true }, 200);
    } catch (error) {
      console.error("[完全削除] エラー:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// POST /deleted/:displayId/restore（復元）
app.openapi(
  createRoute({
    method: "post",
    path: "/deleted/{displayId}/restore",
    request: {
      params: z.object({
        displayId: z.string(),
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

    const db = c.get("db");
    const { displayId } = c.req.valid("param");

    try {
      // まず削除済みタスクを取得
      const deletedTask = await db
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.displayId, displayId),
            eq(tasks.userId, auth.userId),
            isNotNull(tasks.deletedAt),
          ),
        )
        .get();

      if (!deletedTask) {
        return c.json({ error: "Deleted task not found" }, 404);
      }

      // 論理削除を解除（deleted_atをNULLに）
      await db
        .update(tasks)
        .set({
          deletedAt: null,
          updatedAt: Math.floor(Date.now() / 1000), // 復元時刻を更新
        })
        .where(eq(tasks.id, deletedTask.id));

      // 関連するboard_itemsのdeletedAtをNULLに戻す
      await db
        .update(boardItems)
        .set({
          deletedAt: null,
        })
        .where(
          and(
            eq(boardItems.itemType, "task"),
            eq(boardItems.displayId, deletedTask.displayId),
          ),
        );

      return c.json({ success: true, id: deletedTask.id }, 200);
    } catch (error) {
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// POST /import（CSVインポート）
app.openapi(
  createRoute({
    method: "post",
    path: "/import",
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              file: z.any().describe("CSV file to import"),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        description: "CSV import completed",
        content: {
          "application/json": {
            schema: ImportResultSchema,
          },
        },
      },
      400: {
        description: "Invalid file or format",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              details: z.string().optional(),
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

    const db = c.get("db");
    try {
      const body = await c.req.parseBody();
      const file = body["file"] as File;

      if (!file) {
        return c.json({ error: "No file provided" }, 400);
      }

      if (!file.name.endsWith(".csv")) {
        return c.json({ error: "Only CSV files are supported" }, 400);
      }

      const csvText = await file.text();
      const taskData = parseCSV(csvText);

      if (taskData.length === 0) {
        return c.json(
          {
            error: "No valid data found",
            details: "CSV must have 'title' column and at least one data row",
          },
          400,
        );
      }

      const errors: string[] = [];
      let imported = 0;

      // 各タスクを作成
      for (const [index, task] of taskData.entries()) {
        try {
          const parsed = TaskInputSchema.safeParse(task);
          if (!parsed.success) {
            errors.push(`Row ${index + 2}: ${parsed.error.issues[0].message}`);
            continue;
          }

          const { title, description, status, priority, dueDate, categoryId } =
            parsed.data;
          const result = await db
            .insert(tasks)
            .values({
              userId: auth.userId,
              displayId: "", // 後で更新
              uuid: generateUuid(),
              title,
              description: description || null,
              status: status || "todo",
              priority: priority || "medium",
              dueDate: dueDate || null,
              categoryId: categoryId || null,
              createdAt: Math.floor(Date.now() / 1000),
              updatedAt: null,
            })
            .returning({ id: tasks.id });

          // displayId を生成して更新
          const displayId = generateOriginalId(result[0].id);
          await db
            .update(tasks)
            .set({ displayId })
            .where(eq(tasks.id, result[0].id));

          imported++;
        } catch (error) {
          errors.push(`Row ${index + 2}: Failed to create task`);
        }
      }

      return c.json(
        {
          success: true,
          imported,
          errors,
        },
        200,
      );
    } catch (error) {
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// GET /tasks/:id/status-history（ステータス変更履歴取得）
app.openapi(
  createRoute({
    method: "get",
    path: "/{id}/status-history",
    request: {
      params: z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
      }),
    },
    responses: {
      200: {
        description: "Status change history",
        content: {
          "application/json": {
            schema: z.object({
              history: z.array(
                z.object({
                  id: z.number(),
                  fromStatus: z.string().nullable(),
                  toStatus: z.string(),
                  changedAt: z.number(),
                }),
              ),
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

    const db = c.get("db");
    const { id } = c.req.valid("param");

    // タスクの存在確認と所有者確認
    const task = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, auth.userId)))
      .get();

    if (!task) {
      return c.json({ error: "Task not found" }, 404);
    }

    // 履歴を取得（新しい順）
    const history = await db
      .select({
        id: taskStatusHistory.id,
        fromStatus: taskStatusHistory.fromStatus,
        toStatus: taskStatusHistory.toStatus,
        changedAt: taskStatusHistory.changedAt,
      })
      .from(taskStatusHistory)
      .where(eq(taskStatusHistory.taskId, id))
      .orderBy(desc(taskStatusHistory.changedAt));

    return c.json({ history }, 200);
  },
);

export default app;

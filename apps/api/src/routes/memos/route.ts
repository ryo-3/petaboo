import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { memos, deletedMemos } from "../../db/schema/memos";
import { boardItems } from "../../db/schema/boards";
import { taggings } from "../../db/schema/tags";
import { teamNotifications } from "../../db/schema/team/notifications";
import { generateOriginalId, generateUuid } from "../../utils/originalId";

const app = new OpenAPIHono<{
  Bindings: { DB: D1Database };
  Variables: { db: any };
}>();

// データベースミドルウェアを追加
app.use("*", databaseMiddleware);

// Clerk認証ミドルウェアを追加
app.use("*", clerkMiddleware());

// 共通スキーマ定義
const MemoSchema = z.object({
  id: z.number(),
  displayId: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
});

const MemoInputSchema = z.object({
  title: z
    .string()
    .max(200, "タイトルは200文字以内で入力してください")
    .optional()
    .default(""),
  content: z
    .string()
    .max(10000, "内容は10,000文字以内で入力してください")
    .optional(),
});

const ImportResultSchema = z.object({
  success: z.boolean(),
  imported: z.number(),
  errors: z.array(z.string()),
});

// CSVパース関数
function parseCSV(csvText: string): { title: string; content?: string }[] {
  const lines = csvText.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  if (!header.includes("title")) return [];

  const results: { title: string; content?: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 簡単なCSVパース（カンマ区切り、ダブルクォート対応）
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));

    if (values.length >= 1 && values[0]) {
      // 2番目以降のすべての値をcontentとして結合
      const content = values
        .slice(1)
        .filter((v) => v)
        .join("、");
      results.push({
        title: values[0],
        content: content || undefined,
      });
    }
  }

  return results;
}

// GET /memos（OpenAPI付き）
app.openapi(
  createRoute({
    method: "get",
    path: "/",
    responses: {
      200: {
        description: "List of memos",
        content: {
          "application/json": {
            schema: z.array(MemoSchema),
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
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const result = await db
      .select({
        id: memos.id,
        displayId: memos.displayId,
        title: memos.title,
        content: memos.content,
        createdAt: memos.createdAt,
        updatedAt: memos.updatedAt,
      })
      .from(memos)
      .where(eq(memos.userId, auth.userId))
      .orderBy(desc(memos.updatedAt), desc(memos.createdAt));

    return c.json(result, 200);
  },
);

// POST /memos（OpenAPI付き）
app.openapi(
  createRoute({
    method: "post",
    path: "/",
    request: {
      body: {
        content: {
          "application/json": {
            schema: MemoInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Created note",
        content: {
          "application/json": {
            schema: MemoSchema,
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
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const parsed = MemoInputSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400,
      );
    }

    const { title, content } = parsed.data;
    const createdAt = Math.floor(Date.now() / 1000);
    const result = await db
      .insert(memos)
      .values({
        userId: auth.userId,
        displayId: "", // 後で更新
        uuid: generateUuid(), // UUID生成
        title,
        content,
        createdAt,
      })
      .returning({ id: memos.id });

    // displayId を生成して更新
    const displayId = generateOriginalId(result[0].id);
    await db
      .update(memos)
      .set({ displayId, updatedAt: createdAt })
      .where(eq(memos.id, result[0].id));

    // 作成されたメモの完全なオブジェクトを返す
    const newMemo = {
      id: result[0].id,
      displayId,
      title,
      content: content || "",
      createdAt,
      updatedAt: createdAt,
    };

    return c.json(newMemo, 200);
  },
);

// PUT /memos/:id（メモ更新）
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
            schema: MemoInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Updated note",
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
        description: "Note not found",
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
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { id } = c.req.valid("param");
    const body = await c.req.json();
    const parsed = MemoInputSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400,
      );
    }

    const { title, content } = parsed.data;
    const result = await db
      .update(memos)
      .set({
        title,
        content,
        updatedAt: Math.floor(Date.now() / 1000),
      })
      .where(and(eq(memos.id, id), eq(memos.userId, auth.userId)));

    if (result.changes === 0) {
      return c.json({ error: "Note not found" }, 404);
    }

    return c.json({ success: true }, 200);
  },
);

// DELETE /memos/:id（OpenAPI付き）
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
        description: "Note deleted successfully",
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
        description: "Note not found",
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
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { id } = c.req.valid("param");

    // まず該当メモを取得（ユーザー確認込み）
    const note = await db
      .select()
      .from(memos)
      .where(and(eq(memos.id, id), eq(memos.userId, auth.userId)))
      .get();

    if (!note) {
      return c.json({ error: "Note not found" }, 404);
    }

    // D1はトランザクションをサポートしないため、安全な順次実行
    try {
      // Step 1: 削除済みテーブルに安全にコピー
      const insertResult = await db
        .insert(deletedMemos)
        .values({
          userId: auth.userId,
          displayId: note.displayId, // originalIdをそのままコピー
          uuid: note.uuid, // UUIDもコピー
          title: note.title,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          deletedAt: Math.floor(Date.now() / 1000),
        })
        .returning({ id: deletedMemos.id });

      // Step 1.5: コピーが正常に完了したことを確認
      if (!insertResult || insertResult.length === 0) {
        throw new Error("削除済みテーブルへのコピーが失敗しました");
      }

      // Step 2: 関連するboard_itemsのdeletedAtを設定
      await db
        .update(boardItems)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(boardItems.itemType, "memo"),
            eq(boardItems.displayId, note.displayId),
          ),
        );

      // Step 2.5: 関連する通知を削除
      await db
        .delete(teamNotifications)
        .where(
          and(
            eq(teamNotifications.targetType, "memo"),
            eq(teamNotifications.targetDisplayId, note.displayId),
          ),
        );

      // Step 3: コピー完了後に元テーブルから安全に削除
      const deleteResult = await db.delete(memos).where(eq(memos.id, id));

      // Step 3.5: 削除が正常に完了したことを確認
      if (deleteResult.changes === 0) {
        console.warn(
          "元テーブルからの削除で対象が見つかりませんでしたが、コピーは完了済みです",
        );
      }
    } catch (error) {
      // コピー段階でエラーが発生した場合、削除済みテーブルの重複データをクリーンアップ
      try {
        await db
          .delete(deletedMemos)
          .where(
            and(
              eq(deletedMemos.displayId, note.displayId),
              eq(deletedMemos.userId, auth.userId),
            ),
          );
      } catch (cleanupError) {}
      return c.json({ error: "Failed to delete memo" }, 500);
    }

    return c.json({ success: true }, 200);
  },
);

// GET /deleted（削除済みメモ一覧）
app.openapi(
  createRoute({
    method: "get",
    path: "/deleted",
    responses: {
      200: {
        description: "List of deleted memos",
        content: {
          "application/json": {
            schema: z.array(
              z.object({
                id: z.number(),
                displayId: z.string(),
                title: z.string(),
                content: z.string().nullable(),
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
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const result = await db
        .select({
          id: deletedMemos.id,
          displayId: deletedMemos.displayId,
          title: deletedMemos.title,
          content: deletedMemos.content,
          createdAt: deletedMemos.createdAt,
          updatedAt: deletedMemos.updatedAt,
          deletedAt: deletedMemos.deletedAt,
        })
        .from(deletedMemos)
        .where(eq(deletedMemos.userId, auth.userId))
        .orderBy(desc(deletedMemos.deletedAt));
      return c.json(result);
    } catch (error) {
      return c.json({ error: "Internal server error" }, 500);
    }
  },
);

// DELETE /deleted/:displayId（完全削除）
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
        description: "Note permanently deleted",
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
        description: "Deleted note not found",
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
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { displayId } = c.req.valid("param");
    const env = c.env;

    try {
      // R2削除のため、トランザクション前に添付ファイル情報を取得
      const attachmentsToDelete = await db
        .select()
        .from(attachments)
        .where(
          and(
            eq(attachments.attachedTo, "memo"),
            eq(attachments.attachedDisplayId, displayId),
            eq(attachments.userId, auth.userId),
          ),
        );

      // R2から実ファイルを削除
      const r2Bucket = env.R2_BUCKET;
      if (r2Bucket && attachmentsToDelete.length > 0) {
        for (const attachment of attachmentsToDelete) {
          try {
            await r2Bucket.delete(attachment.r2Key);
            console.log(`🗑️ [R2削除成功] ${attachment.r2Key}`);
          } catch (error) {
            console.error(`❌ [R2削除失敗] ${attachment.r2Key}`, error);
            // R2削除失敗してもDB削除は続行
          }
        }
      }

      const result = db.transaction((tx) => {
        // 1. タグ付けを削除（タグ本体は保持）
        tx.delete(taggings)
          .where(
            and(
              eq(taggings.targetType, "memo"),
              eq(taggings.targetDisplayId, displayId),
            ),
          )
          .run();

        // 2. 添付ファイルを削除
        tx.delete(attachments)
          .where(
            and(
              eq(attachments.attachedTo, "memo"),
              eq(attachments.attachedDisplayId, displayId),
            ),
          )
          .run();

        // 3. 関連するボードアイテムは削除しない（削除済みタブで表示するため保持）

        // 4. メモを削除
        const deleteResult = tx
          .delete(deletedMemos)
          .where(
            and(
              eq(deletedMemos.displayId, displayId),
              eq(deletedMemos.userId, auth.userId),
            ),
          )
          .run();

        return deleteResult;
      });

      if (result.changes === 0) {
        return c.json({ error: "Deleted note not found" }, 404);
      }

      return c.json({ success: true }, 200);
    } catch (error) {
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
        description: "Note restored successfully",
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
        description: "Deleted note not found",
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
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { displayId } = c.req.valid("param");

    try {
      // まず削除済みメモを取得
      const deletedNote = await db
        .select()
        .from(deletedMemos)
        .where(
          and(
            eq(deletedMemos.displayId, displayId),
            eq(deletedMemos.userId, auth.userId),
          ),
        )
        .get();

      if (!deletedNote) {
        return c.json({ error: "Deleted note not found" }, 404);
      }

      // D1はトランザクションをサポートしないため、順次実行
      // 通常メモテーブルに復元
      const result = await db
        .insert(memos)
        .values({
          userId: auth.userId,
          displayId: deletedNote.displayId, // displayIdを復元
          uuid: deletedNote.uuid, // UUIDも復元
          title: deletedNote.title,
          content: deletedNote.content,
          createdAt: deletedNote.createdAt,
          updatedAt: Math.floor(Date.now() / 1000), // 復元時刻を更新
        })
        .returning({ id: memos.id });

      // displayIdは元の値を保持（新しいIDに更新しない）

      // 関連するboard_itemsのdeletedAtをNULLに戻す（displayIdは元の値を保持）
      await db
        .update(boardItems)
        .set({
          deletedAt: null,
          // displayIdは元の値を保持
        })
        .where(
          and(
            eq(boardItems.itemType, "memo"),
            eq(boardItems.displayId, deletedNote.displayId),
          ),
        );

      // 削除済みテーブルから削除
      await db
        .delete(deletedMemos)
        .where(eq(deletedMemos.displayId, displayId));

      return c.json({ success: true, id: result[0].id }, 200);
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
    const db = c.get("db");
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

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
      const memoData = parseCSV(csvText);

      if (memoData.length === 0) {
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

      // 各メモを作成
      for (const [index, memo] of memoData.entries()) {
        try {
          const parsed = MemoInputSchema.safeParse(memo);
          if (!parsed.success) {
            errors.push(`Row ${index + 2}: ${parsed.error.issues[0].message}`);
            continue;
          }

          const { title, content } = parsed.data;
          // メモエディター形式に合わせて保存：title + '\n' + content
          const combinedContent = title + (content ? "\n" + content : "");

          const result = await db
            .insert(memos)
            .values({
              userId: auth.userId,
              displayId: "", // 後で更新
              uuid: generateUuid(),
              title,
              content: combinedContent,
              createdAt: Math.floor(Date.now() / 1000),
            })
            .returning({ id: memos.id });

          // displayId を生成して更新
          const displayId = generateOriginalId(result[0].id);
          await db
            .update(memos)
            .set({ displayId })
            .where(eq(memos.id, result[0].id));

          imported++;
        } catch (error) {
          errors.push(`Row ${index + 2}: Failed to create memo`);
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

export default app;

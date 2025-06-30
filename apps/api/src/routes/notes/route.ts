import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc, and } from "drizzle-orm";
import Database from "better-sqlite3";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { notes, deletedNotes } from "../../db/schema/notes";

// SQLite & drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const app = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
app.use('*', clerkMiddleware());

// 共通スキーマ定義
const NoteSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string().nullable(),
  createdAt: z.number(),
  updatedAt: z.number().nullable(),
});

const NoteInputSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
});

// GET /notes（OpenAPI付き）
app.openapi(
  createRoute({
    method: "get",
    path: "/",
    responses: {
      200: {
        description: "List of notes",
        content: {
          "application/json": {
            schema: z.array(NoteSchema),
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
      id: notes.id,
      title: notes.title,
      content: notes.content,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
    }).from(notes).where(eq(notes.userId, auth.userId));
    
    return c.json(result, 200);
  }
);

// POST /notes（OpenAPI付き）
app.openapi(
  createRoute({
    method: "post",
    path: "/",
    request: {
      body: {
        content: {
          "application/json": {
            schema: NoteInputSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Created note",
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
    const parsed = NoteInputSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400
      );
    }

    const { title, content } = parsed.data;
    const result = await db.insert(notes).values({
      userId: auth.userId,
      title,
      content,
      createdAt: Math.floor(Date.now() / 1000),
    }).returning({ id: notes.id });

    return c.json({ success: true, id: result[0].id as number }, 200);
  }
);

// PUT /notes/:id（メモ更新）
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
            schema: NoteInputSchema,
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
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { id } = c.req.valid("param");
    const body = await c.req.json();
    const parsed = NoteInputSchema.safeParse(body);

    if (!parsed.success) {
      return c.json(
        { error: "Invalid input", issues: parsed.error.issues },
        400
      );
    }

    const { title, content } = parsed.data;
    const result = await db.update(notes)
      .set({ 
        title, 
        content,
        updatedAt: Math.floor(Date.now() / 1000)
      })
      .where(and(eq(notes.id, id), eq(notes.userId, auth.userId)));

    if (result.changes === 0) {
      return c.json({ error: "Note not found" }, 404);
    }

    return c.json({ success: true }, 200);
  }
);

// DELETE /notes/:id（OpenAPI付き）
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
    },
  }),
  async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { id } = c.req.valid("param");
    
    // まず該当メモを取得（ユーザー確認込み）
    const note = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, auth.userId))).get();
    
    if (!note) {
      return c.json({ error: "Note not found" }, 404);
    }

    // トランザクションで削除済みテーブルに移動してから元テーブルから削除
    db.transaction((tx) => {
      // 削除済みテーブルに挿入
      tx.insert(deletedNotes).values({
        userId: auth.userId,
        originalId: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        deletedAt: Math.floor(Date.now() / 1000),
      }).run();

      // 元テーブルから削除
      tx.delete(notes).where(eq(notes.id, id)).run();
    });

    return c.json({ success: true }, 200);
  }
);

// GET /deleted（削除済みメモ一覧）
app.openapi(
  createRoute({
    method: "get",
    path: "/deleted",
    responses: {
      200: {
        description: "List of deleted notes",
        content: {
          "application/json": {
            schema: z.array(z.object({
              id: z.number(),
              originalId: z.number(),
              title: z.string(),
              content: z.string().nullable(),
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
        id: deletedNotes.id,
        originalId: deletedNotes.originalId,
        title: deletedNotes.title,
        content: deletedNotes.content,
        createdAt: deletedNotes.createdAt,
        updatedAt: deletedNotes.updatedAt,
        deletedAt: deletedNotes.deletedAt,
      }).from(deletedNotes)
        .where(eq(deletedNotes.userId, auth.userId))
        .orderBy(desc(deletedNotes.deletedAt));
      return c.json(result);
    } catch (error) {
      console.error('削除済みメモ取得エラー:', error);
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
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { id } = c.req.valid("param");
    
    try {
      const result = await db.delete(deletedNotes).where(
        and(eq(deletedNotes.id, id), eq(deletedNotes.userId, auth.userId))
      );
      
      if (result.changes === 0) {
        return c.json({ error: "Deleted note not found" }, 404);
      }

      return c.json({ success: true }, 200);
    } catch (error) {
      console.error('完全削除エラー:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
);

// POST /deleted/:id/restore（復元）
app.openapi(
  createRoute({
    method: "post",
    path: "/deleted/{id}/restore",
    request: {
      params: z.object({
        id: z.string().regex(/^\d+$/).transform(Number),
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
    if (!auth?.userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { id } = c.req.valid("param");
    
    try {
      // まず削除済みメモを取得
      const deletedNote = await db.select().from(deletedNotes).where(
        and(eq(deletedNotes.id, id), eq(deletedNotes.userId, auth.userId))
      ).get();
      
      if (!deletedNote) {
        return c.json({ error: "Deleted note not found" }, 404);
      }

      // トランザクションで復元処理
      const restoredNote = db.transaction((tx) => {
        // 通常メモテーブルに復元
        const result = tx.insert(notes).values({
          userId: auth.userId,
          title: deletedNote.title,
          content: deletedNote.content,
          createdAt: deletedNote.createdAt,
          updatedAt: deletedNote.updatedAt,
        }).returning({ id: notes.id }).get();

        // 削除済みテーブルから削除
        tx.delete(deletedNotes).where(eq(deletedNotes.id, id)).run();

        return result;
      });

      return c.json({ success: true, id: restoredNote.id as number }, 200);
    } catch (error) {
      console.error('復元エラー:', error);
      return c.json({ error: 'Internal server error' }, 500);
    }
  }
);

export default app;

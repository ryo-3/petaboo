import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq, desc } from "drizzle-orm";
import Database from "better-sqlite3";
import { notes, deletedNotes } from "@/db/schema/notes";

// SQLite & drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const app = new OpenAPIHono();

// 共通スキーマ定義
const NoteSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string().nullable(),
  createdAt: z.number(),
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
    },
  }),
  async (c) => {
    const result = await db.select().from(notes);
    return c.json(result);
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
    },
  }),
  async (c) => {
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
      title,
      content,
      createdAt: Math.floor(Date.now() / 1000),
    }).returning({ id: notes.id });

    return c.json({ success: true, id: result[0].id }, 200);
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
      404: {
        description: "Note not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
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
    },
  }),
  async (c) => {
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
      .set({ title, content })
      .where(eq(notes.id, id));

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
    const { id } = c.req.valid("param");
    
    // まず該当メモを取得
    const note = await db.select().from(notes).where(eq(notes.id, id)).get();
    
    if (!note) {
      return c.json({ error: "Note not found" }, 404);
    }

    // トランザクションで削除済みテーブルに移動してから元テーブルから削除
    db.transaction((tx) => {
      // 削除済みテーブルに挿入
      tx.insert(deletedNotes).values({
        originalId: note.id,
        title: note.title,
        content: note.content,
        createdAt: note.createdAt,
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
              deletedAt: z.number(),
            })),
          },
        },
      },
    },
  }),
  async (c) => {
    try {
      const result = await db.select().from(deletedNotes).orderBy(desc(deletedNotes.deletedAt));
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
      404: {
        description: "Deleted note not found",
        content: {
          "application/json": {
            schema: z.object({ error: z.string() }),
          },
        },
      },
    },
  }),
  async (c) => {
    const { id } = c.req.valid("param");
    
    try {
      const result = await db.delete(deletedNotes).where(eq(deletedNotes.id, id));
      
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

export default app;

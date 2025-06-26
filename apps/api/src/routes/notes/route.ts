import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { notes } from "@/db/schema/notes";

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
            schema: z.object({ success: z.literal(true) }),
          },
        },
      },
      400: {
        description: "Invalid input",
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              issues: z.any(),
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
    await db.insert(notes).values({
      title,
      content,
      createdAt: Math.floor(Date.now() / 1000),
    });

    return c.json({ success: true });
  }
);

export default app;

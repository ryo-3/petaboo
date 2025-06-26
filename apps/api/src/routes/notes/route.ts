// apps/api/src/routes/notes/route.ts
import { Hono } from "hono";
import { z } from "zod";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { notes } from "@/db/schema/notes";

// SQLite 接続 & Drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

// バリデーションスキーマ
const NoteSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
});

const app = new Hono();

// GET /notes
app.get("/", async (c) => {
  const result = await db.select().from(notes);
  return c.json(result);
});

// POST /notes
app.post("/", async (c) => {
  const body = await c.req.json();
  const parsed = NoteSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid input", issues: parsed.error.issues }, 400);
  }

  const { title, content } = parsed.data;
  await db.insert(notes).values({
    title,
    content,
    createdAt: Math.floor(Date.now() / 1000),
  });

  return c.json({ success: true });
});

export default app;

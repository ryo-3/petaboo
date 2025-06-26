import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const notes = sqliteTable("notes", {
  id: integer("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content"),
  createdAt: integer("created_at").notNull(),
});

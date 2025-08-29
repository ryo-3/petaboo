import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  userId: text("user_id").primaryKey(), // ClerkのuserIdと一致
  displayName: text("display_name"), // チーム機能用の表示名（オプショナル）
  planType: text("plan_type", { enum: ["free", "premium"] })
    .notNull()
    .default("free"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

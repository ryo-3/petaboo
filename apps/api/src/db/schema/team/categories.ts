import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const teamCategories = sqliteTable("team_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(), // 作成者
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
});

export type TeamCategory = typeof teamCategories.$inferSelect;
export type NewTeamCategory = typeof teamCategories.$inferInsert;

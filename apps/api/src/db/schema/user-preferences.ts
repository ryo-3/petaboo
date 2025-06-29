import { integer, sqliteTable, text, real } from 'drizzle-orm/sqlite-core';

export const userPreferences = sqliteTable('user_preferences', {
  userId: integer('user_id').primaryKey(),
  columnCount: integer('column_count').default(4).notNull(),
  createdAt: real('created_at').default(Date.now()).notNull(),
  updatedAt: real('updated_at').default(Date.now()).notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
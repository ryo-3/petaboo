import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  customUrl: text("custom_url").notNull().unique(),
  // isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false), // 一時的にコメントアウト
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

export const teamMembers = sqliteTable("team_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  userId: text("user_id").notNull(),
  role: text("role").notNull().default("member"), // "admin" | "member"
  joinedAt: integer("joined_at").notNull(),
});

// 招待・申請を統一管理するテーブル
export const teamInvitations = sqliteTable("team_invitations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  email: text("email").notNull(), // メール招待時はメール、URL招待時は"URL_INVITE"、申請時は申請者メール
  role: text("role").notNull().default("member"), // "admin" | "member"
  token: text("token").notNull(),
  invitedBy: text("invited_by").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "active" | "approved" | "rejected" | "expired"
  // 新フィールド（既存データとの互換性のため任意）
  userId: text("user_id"), // 申請者のClerk user ID（申請時のみ）
  displayName: text("display_name"), // 申請者の表示名（申請時のみ）
  message: text("message"), // 申請メッセージ（任意）
  processedAt: integer("processed_at"), // 承認・拒否された日時
  processedBy: text("processed_by"), // 承認・拒否した管理者のuser_id
});

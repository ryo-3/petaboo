import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
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

export const teamInvitations = sqliteTable("team_invitations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"), // "admin" | "member"
  token: text("token").notNull(),
  invitedBy: text("invited_by").notNull(),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "accepted" | "expired"
});
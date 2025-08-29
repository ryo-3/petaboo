import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import {
  createTeamRoute,
  getMyTeamRoute,
  joinTeamRoute,
  getTeamsRoute,
  createTeam,
  getMyTeam,
  joinTeam,
  getTeams,
  getUserTeamStatsRoute,
  getUserTeamStats,
  getTeamDetailRoute,
  getTeamDetail,
  inviteToTeamRoute,
  inviteToTeam,
  getInvitationRoute,
  getInvitation,
  acceptInvitationRoute,
  acceptInvitation,
} from "./api";

// SQLite & drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const teamsRoute = new OpenAPIHono();

// データベースをコンテキストに設定
teamsRoute.use("*", async (c, next) => {
  c.env = { ...c.env, db };
  await next();
});

// Clerk認証ミドルウェアを適用
teamsRoute.use("*", clerkMiddleware());

// ルート定義を登録
teamsRoute.openapi(getUserTeamStatsRoute, getUserTeamStats);
teamsRoute.openapi(getTeamsRoute, getTeams);
teamsRoute.openapi(getTeamDetailRoute, getTeamDetail);
teamsRoute.openapi(createTeamRoute, createTeam);
teamsRoute.openapi(inviteToTeamRoute, inviteToTeam);
teamsRoute.openapi(getInvitationRoute, getInvitation);
teamsRoute.openapi(acceptInvitationRoute, acceptInvitation);
teamsRoute.openapi(getMyTeamRoute, getMyTeam);
teamsRoute.openapi(joinTeamRoute, joinTeam);

console.log("チームAPIルート登録完了 - 招待ルート:", inviteToTeamRoute.path);

export default teamsRoute;

import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { createTeamRoute, getMyTeamRoute, joinTeamRoute, createTeam, getMyTeam, joinTeam } from "./api";

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
teamsRoute.openapi(createTeamRoute, createTeam);
teamsRoute.openapi(getMyTeamRoute, getMyTeam);
teamsRoute.openapi(joinTeamRoute, joinTeam);

export default teamsRoute;
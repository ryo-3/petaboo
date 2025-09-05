import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
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
  generateInviteUrlRoute,
  generateInviteUrl,
} from "./api";
import { createTeamBoardsAPI } from "./boards";

// SQLite & drizzle セットアップ

const teamsRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを適用
teamsRoute.use("*", clerkMiddleware());

// データベースミドルウェアを追加
teamsRoute.use("*", databaseMiddleware);

// ルート定義を登録
teamsRoute.openapi(getUserTeamStatsRoute, getUserTeamStats);
teamsRoute.openapi(getTeamsRoute, getTeams);
teamsRoute.openapi(getTeamDetailRoute, getTeamDetail);
teamsRoute.openapi(createTeamRoute, createTeam);
teamsRoute.openapi(inviteToTeamRoute, inviteToTeam);
teamsRoute.openapi(generateInviteUrlRoute, generateInviteUrl);
teamsRoute.openapi(getInvitationRoute, getInvitation);
teamsRoute.openapi(acceptInvitationRoute, acceptInvitation);
teamsRoute.openapi(getMyTeamRoute, getMyTeam);
teamsRoute.openapi(joinTeamRoute, joinTeam);

// チーム用ボードAPIを追加
createTeamBoardsAPI(teamsRoute);

console.log("チームAPIルート登録完了 - 招待ルート:", inviteToTeamRoute.path);

export default teamsRoute;

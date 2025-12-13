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
  getInviteUrlRoute,
  getInviteUrl,
  deleteInviteUrlRoute,
  deleteInviteUrl,
  verifyInviteTokenRoute,
  verifyInviteToken,
  submitJoinRequestRoute,
  submitJoinRequest,
  getJoinRequestsRoute,
  getJoinRequests,
  approveJoinRequestRoute,
  approveJoinRequest,
  rejectJoinRequestRoute,
  rejectJoinRequest,
  getMyJoinRequestsRoute,
  getMyJoinRequests,
  waitMyRequestUpdatesRoute,
  waitMyRequestUpdates,
  updateTeamRoute,
  updateTeam,
  deleteTeamRoute,
  deleteTeam,
  waitUpdatesRoute,
  waitUpdatesHandler,
  waitHomeUpdatesRoute,
  waitHomeUpdatesHandler,
  kickMemberRoute,
  kickMember,
  updateMemberDisplayNameRoute,
  updateMemberDisplayName,
} from "./api";
import { notificationCheckRoute, notificationCheck } from "./check";
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
teamsRoute.openapi(getMyJoinRequestsRoute, getMyJoinRequests);
teamsRoute.openapi(getTeamDetailRoute, getTeamDetail);
teamsRoute.openapi(createTeamRoute, createTeam);
teamsRoute.openapi(inviteToTeamRoute, inviteToTeam);
teamsRoute.openapi(getInviteUrlRoute, getInviteUrl);
teamsRoute.openapi(generateInviteUrlRoute, generateInviteUrl);
teamsRoute.openapi(deleteInviteUrlRoute, deleteInviteUrl);
teamsRoute.openapi(verifyInviteTokenRoute, verifyInviteToken);
teamsRoute.openapi(submitJoinRequestRoute, submitJoinRequest);
teamsRoute.openapi(getJoinRequestsRoute, getJoinRequests);
teamsRoute.openapi(approveJoinRequestRoute, approveJoinRequest);
teamsRoute.openapi(rejectJoinRequestRoute, rejectJoinRequest);
teamsRoute.openapi(getInvitationRoute, getInvitation);
teamsRoute.openapi(acceptInvitationRoute, acceptInvitation);
teamsRoute.openapi(getMyTeamRoute, getMyTeam);
teamsRoute.openapi(joinTeamRoute, joinTeam);
teamsRoute.openapi(updateTeamRoute, updateTeam);
teamsRoute.openapi(deleteTeamRoute, deleteTeam);
teamsRoute.openapi(waitMyRequestUpdatesRoute, waitMyRequestUpdates);
teamsRoute.openapi(waitHomeUpdatesRoute, waitHomeUpdatesHandler);
teamsRoute.openapi(waitUpdatesRoute, waitUpdatesHandler);
teamsRoute.openapi(kickMemberRoute, kickMember);
teamsRoute.openapi(updateMemberDisplayNameRoute, updateMemberDisplayName);
teamsRoute.openapi(notificationCheckRoute, notificationCheck);

// チーム用ボードAPIを追加
createTeamBoardsAPI(teamsRoute);

export default teamsRoute;

import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import {
  getUserInfoRoute,
  getUserInfo,
  updateUserPlanRoute,
  updateUserPlan,
  getSpecificUserInfoRoute,
  getSpecificUserInfo,
  updateSpecificUserPlanRoute,
  updateSpecificUserPlan,
  getUsersListRoute,
  getUsersList,
  updateDisplayNameRoute,
  updateDisplayName,
} from "./api";
import { databaseMiddleware } from "../../middleware/database";

const usersRoute = new OpenAPIHono();

// データベースミドルウェアを適用（最初に）
usersRoute.use("*", databaseMiddleware);

// Clerk認証ミドルウェアを適用
usersRoute.use("*", clerkMiddleware());

// ルート定義を登録
usersRoute.openapi(getUsersListRoute, getUsersList);
usersRoute.openapi(getUserInfoRoute, getUserInfo);
usersRoute.openapi(updateUserPlanRoute, updateUserPlan);
usersRoute.openapi(updateDisplayNameRoute, updateDisplayName);
usersRoute.openapi(getSpecificUserInfoRoute, getSpecificUserInfo);
usersRoute.openapi(updateSpecificUserPlanRoute, updateSpecificUserPlan);

export default usersRoute;

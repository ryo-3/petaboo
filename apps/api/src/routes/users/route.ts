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
  getUserRoute,
  getUser,
  updateUserRoute,
  updateUser,
  getUsersListRoute,
  getUsersList,
  getUserByIdRoute,
  getUserById,
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
usersRoute.openapi(getUserByIdRoute, getUserById);
usersRoute.openapi(getUserInfoRoute, getUserInfo);
usersRoute.openapi(updateUserPlanRoute, updateUserPlan);
usersRoute.openapi(updateDisplayNameRoute, updateDisplayName);
usersRoute.openapi(getSpecificUserInfoRoute, getSpecificUserInfo);
usersRoute.openapi(updateSpecificUserPlanRoute, updateSpecificUserPlan);
usersRoute.openapi(getUserRoute, getUser);
usersRoute.openapi(updateUserRoute, updateUser);

export default usersRoute;

import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import {
  getUserInfoRoute,
  getUserInfo,
  updateUserPlanRoute,
  updateUserPlan,
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
  ensureUserExistsRoute,
  ensureUserExists,
} from "./api";
import { databaseMiddleware } from "../../middleware/database";

const usersRoute = new OpenAPIHono();

// データベースミドルウェアを適用（最初に）
usersRoute.use("*", databaseMiddleware);

// Clerk認証ミドルウェアを適用
usersRoute.use("*", clerkMiddleware());

// ルート定義を登録（特定パスを先に定義）
usersRoute.openapi(ensureUserExistsRoute, ensureUserExists);
usersRoute.openapi(getUserInfoRoute, getUserInfo); // /me を先に
usersRoute.openapi(updateUserPlanRoute, updateUserPlan);
usersRoute.openapi(updateDisplayNameRoute, updateDisplayName);
usersRoute.openapi(getUsersListRoute, getUsersList);
usersRoute.openapi(getUserByIdRoute, getUserById); // /{id} を後に
usersRoute.openapi(updateSpecificUserPlanRoute, updateSpecificUserPlan);
usersRoute.openapi(getUserRoute, getUser);
usersRoute.openapi(updateUserRoute, updateUser);

export default usersRoute;

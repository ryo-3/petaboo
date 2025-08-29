import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
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
} from "./api";

// SQLite & drizzle セットアップ
const sqlite = new Database("sqlite.db");
const db = drizzle(sqlite);

const usersRoute = new OpenAPIHono();

// データベースをコンテキストに設定
usersRoute.use("*", async (c, next) => {
  c.env = { ...c.env, db };
  await next();
});

// Clerk認証ミドルウェアを適用
usersRoute.use("*", clerkMiddleware());

// ルート定義を登録
usersRoute.openapi(getUsersListRoute, getUsersList);
usersRoute.openapi(getUserInfoRoute, getUserInfo);
usersRoute.openapi(updateUserPlanRoute, updateUserPlan);
usersRoute.openapi(getSpecificUserInfoRoute, getSpecificUserInfo);
usersRoute.openapi(updateSpecificUserPlanRoute, updateSpecificUserPlan);

export default usersRoute;

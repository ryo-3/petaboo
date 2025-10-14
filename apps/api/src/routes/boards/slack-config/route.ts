import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../../middleware/database";
import { createAPI } from "./api";

const boardSlackConfigRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
boardSlackConfigRoute.use("*", clerkMiddleware());

// データベースミドルウェアを追加
boardSlackConfigRoute.use("*", databaseMiddleware);

const api = createAPI(boardSlackConfigRoute);

export default api;

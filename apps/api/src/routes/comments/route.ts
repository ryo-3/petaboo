import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { createAPI } from "./api";

const commentsRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
commentsRoute.use("*", clerkMiddleware());

// データベースミドルウェアを追加
commentsRoute.use("*", databaseMiddleware);

const api = createAPI(commentsRoute);

export default api;

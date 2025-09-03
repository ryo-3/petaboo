import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { createAPI } from "./api";

const boardsRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
boardsRoute.use("*", clerkMiddleware());

// データベースミドルウェアを追加
boardsRoute.use("*", databaseMiddleware);

const api = createAPI(boardsRoute);

export default api;

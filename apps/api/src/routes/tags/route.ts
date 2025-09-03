import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { createAPI } from "./api";

const tagsRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
tagsRoute.use("*", clerkMiddleware());

// データベースミドルウェアを追加
tagsRoute.use("*", databaseMiddleware);

const api = createAPI(tagsRoute);

export default api;

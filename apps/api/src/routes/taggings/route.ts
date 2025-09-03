import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { createAPI } from "./api";

const taggingsRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
taggingsRoute.use("*", clerkMiddleware());

// データベースミドルウェアを追加
taggingsRoute.use("*", databaseMiddleware);

const api = createAPI(taggingsRoute);

export default api;

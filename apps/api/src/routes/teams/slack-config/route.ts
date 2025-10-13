import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../../middleware/database";
import { createAPI } from "./api";

const slackConfigRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
slackConfigRoute.use("*", clerkMiddleware());

// データベースミドルウェアを追加
slackConfigRoute.use("*", databaseMiddleware);

const api = createAPI(slackConfigRoute);

export default api;

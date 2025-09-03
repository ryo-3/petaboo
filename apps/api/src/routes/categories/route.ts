import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { createAPI } from "./api";

const categoriesRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
categoriesRoute.use("*", clerkMiddleware());

// データベースミドルウェアを追加
categoriesRoute.use("*", databaseMiddleware);

const api = createAPI(categoriesRoute);

export default api;

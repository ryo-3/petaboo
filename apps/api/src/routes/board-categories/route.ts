import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { createAPI } from "./api";

const boardCategoriesRoute = new OpenAPIHono();

// Clerk認証ミドルウェアを追加
boardCategoriesRoute.use("*", clerkMiddleware());

// データベースミドルウェアを追加
boardCategoriesRoute.use("*", databaseMiddleware);

const api = createAPI(boardCategoriesRoute);

export default api;

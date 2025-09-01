/// <reference types="@cloudflare/workers-types" />

import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createD1Database } from "./src/db/connection";
import openapiApp from "./src/openapi";
import memosRoute from "./src/routes/memos/route";
import tasksRoute from "./src/routes/tasks/route";
import userPreferencesRoute from "./src/routes/user-preferences/route";
import categoriesRoute from "./src/routes/categories/route";
import boardsRoute from "./src/routes/boards/route";
import tagsRoute from "./src/routes/tags/route";
import taggingsRoute from "./src/routes/taggings/route";
import boardCategoriesRoute from "./src/routes/board-categories/route";
import teamsRoute from "./src/routes/teams/route";
import teamMemosRoute from "./src/routes/teams/memos";
import teamTasksRoute from "./src/routes/teams/tasks";
import teamShareRoute from "./src/routes/teams/share";
import clerkWebhook from "./src/routes/webhooks/clerk";
import usersRoute from "./src/routes/users/route";

export interface Env {
  DB: D1Database;
  CLERK_SECRET_KEY: string;
  CLERK_PUBLISHABLE_KEY: string;
  RESEND_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

// データベースミドルウェア（D1専用）
app.use("*", async (c, next) => {
  const db = createD1Database(c.env.DB);
  c.set("db", db);
  await next();
});

// CORS設定（本番用に調整）
app.use(
  "*",
  cors({
    origin: [
      "https://your-app.vercel.app", // 本番Vercel URL（後で更新）
      "http://localhost:7593", // 開発用
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// OpenAPI仕様・Swagger UI
app.route("/openapi", openapiApp);
app.get("/", swaggerUI({ url: "/openapi" }));

// API Routes
app.route("/memos", memosRoute);
app.route("/tasks", tasksRoute);
app.route("/user-preferences", userPreferencesRoute);
app.route("/categories", categoriesRoute);
app.route("/boards", boardsRoute);
app.route("/tags", tagsRoute);
app.route("/taggings", taggingsRoute);
app.route("/board-categories", boardCategoriesRoute);
app.route("/teams", teamsRoute);
app.route("/teams/memos", teamMemosRoute);
app.route("/teams/tasks", teamTasksRoute);
app.route("/teams/share", teamShareRoute);
app.route("/webhooks/clerk", clerkWebhook);
app.route("/users", usersRoute);

export default app;

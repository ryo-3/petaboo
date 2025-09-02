/// <reference types="@cloudflare/workers-types" />

import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { cors } from "hono/cors";
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

// CORS設定（本番環境用）
app.use(
  "*",
  cors({
    origin: ["https://petaboo.vercel.app", "http://localhost:7593"], // 本番・開発ドメイン
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

// リクエストログミドルウェア
app.use("*", async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const url = c.req.url;

  console.log(`[${new Date().toISOString()}] ${method} ${url}`);

  await next();

  const duration = Date.now() - start;
  console.log(
    `[${new Date().toISOString()}] ${method} ${url} - ${c.res.status} (${duration}ms)`,
  );
});

// 基本ルート
app.get("/", (c) => {
  return c.json({
    message: "Petaboo API is running on Cloudflare Workers with D1!",
    timestamp: new Date().toISOString(),
    environment: "production",
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: "production",
  });
});

// 全APIルートを統合
app.route("/memos", memosRoute);
app.route("/tasks", tasksRoute);
app.route("/user-preferences", userPreferencesRoute);
app.route("/categories", categoriesRoute);
app.route("/boards", boardsRoute);
app.route("/tags", tagsRoute);
app.route("/taggings", taggingsRoute);
app.route("/board-categories", boardCategoriesRoute);
app.route("/teams", teamsRoute);
app.route("/teams", teamMemosRoute);
app.route("/teams", teamTasksRoute);
app.route("/teams", teamShareRoute);
app.route("/webhooks/clerk", clerkWebhook);
app.route("/users", usersRoute);

// OpenAPI設定
app.get("/openapi", (c) => {
  const openapiJson = openapiApp.getOpenAPIDocument({
    openapi: "3.1.0",
    info: {
      title: "Petaboo API",
      version: "1.0.0",
      description: "Petaboo本番API - Cloudflare Workers + D1",
    },
  });
  return c.json(openapiJson);
});

app.get("/docs", swaggerUI({ url: "/openapi" }));

export default app;

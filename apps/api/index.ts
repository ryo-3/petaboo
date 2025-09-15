import { serve } from "@hono/node-server";
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
import teamBoardsRoute from "./src/routes/teams/boards-route";
import clerkWebhook from "./src/routes/webhooks/clerk";
import usersRoute from "./src/routes/users/route";
import { execSync } from "child_process";

const app = new Hono();

// CORS設定
app.use(
  "*",
  cors({
    origin: "http://localhost:7593",
    credentials: false,
  }),
);

// 基本ルート
app.get("/", (c) => {
  return c.json({
    message: "ぺたぼー (PETABoo) API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

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
app.route("/teams", teamBoardsRoute);
app.route("/webhooks/clerk", clerkWebhook);
app.route("/users", usersRoute);
app.get("/openapi", (c) => {
  const openapiJson = openapiApp.getOpenAPIDocument({
    openapi: "3.1.0", // バージョンは "3.0.0" でもOK
    info: {
      title: "memo API", // 好きなタイトル
      version: "1.0.0", // バージョン
      description: "API docs", // 説明
    },
  });
  return c.json(openapiJson);
});

app.get("/docs", swaggerUI({ url: "/openapi" }));

// 開発用ログクリアエンドポイント
app.post("/dev/clear-logs", async (c) => {
  try {
    execSync("cd /home/ryosuke/petaboo && ./clear-logs.sh", {
      stdio: "inherit",
    });
    return c.json({ success: true, message: "Logs cleared successfully" });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

serve({ fetch: app.fetch, port: 7594 });

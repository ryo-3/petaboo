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
import clerkWebhook from "./src/routes/webhooks/clerk";
import usersRoute from "./src/routes/users/route";

// 環境変数確認（開発環境のみ）
if (process.env.NODE_ENV === "development") {
  console.log("=== API Server Environment ===");
  console.log(
    "CLERK_SECRET_KEY:",
    process.env.CLERK_SECRET_KEY
      ? `${process.env.CLERK_SECRET_KEY.substring(0, 20)}...`
      : "未設定",
  );
  console.log(
    "CLERK_PUBLISHABLE_KEY:",
    process.env.CLERK_PUBLISHABLE_KEY
      ? `${process.env.CLERK_PUBLISHABLE_KEY.substring(0, 20)}...`
      : "未設定",
  );
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("==============================");
}

const app = new Hono();

// CORS設定
app.use(
  "*",
  cors({
    origin: "http://localhost:7593",
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

console.log("サーバー起動！");

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

serve({ fetch: app.fetch, port: 7594 });

import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { Hono } from "hono";
import { cors } from "hono/cors";
import openapiApp from "./src/openapi";
import notesRoute from "./src/routes/notes/route";
import tasksRoute from "./src/routes/tasks/route";
import userPreferencesRoute from "./src/routes/user-preferences/route";
import categoriesRoute from "./src/routes/categories/route";
import boardsRoute from "./src/routes/boards/route";

// 環境変数確認（デバッグ用）
console.log("CLERK_SECRET_KEY:", process.env.CLERK_SECRET_KEY ? "設定済み" : "未設定");

const app = new Hono();

// CORS設定
app.use("*", cors({
  origin: "http://localhost:7593",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

console.log("サーバー起動！");

app.route("/notes", notesRoute);
app.route("/tasks", tasksRoute);
app.route("/user-preferences", userPreferencesRoute);
app.route("/categories", categoriesRoute);
app.route("/boards", boardsRoute);
app.get("/openapi", (c) => {
  const openapiJson = openapiApp.getOpenAPIDocument({
    openapi: "3.1.0", // バージョンは "3.0.0" でもOK
    info: {
      title: "Notes API", // 好きなタイトル
      version: "1.0.0", // バージョン
      description: "Notes API docs", // 説明
    },
  });
  return c.json(openapiJson);
});

app.get("/docs", swaggerUI({ url: "/openapi" }));

serve({ fetch: app.fetch, port: 8794 });

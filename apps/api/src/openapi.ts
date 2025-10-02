// apps/api/src/openapi.ts
import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";

// 手動でルートをインポート
import memosRoute from "./routes/memos/route";
import tasksRoute from "./routes/tasks/route";
import userPreferencesRoute from "./routes/user-preferences/route";
import categoriesRoute from "./routes/categories/route";
import boardsRoute from "./routes/boards/route";
import tagsRoute from "./routes/tags/route";
import taggingsRoute from "./routes/taggings/route";
import boardCategoriesRoute from "./routes/board-categories/route";
import teamsRoute from "./routes/teams/route";
import teamMemosRoute from "./routes/teams/memos";
import teamTasksRoute from "./routes/teams/tasks";
import teamShareRoute from "./routes/teams/share";
import commentsRoute from "./routes/comments/route";
// import teamTagsRoute from "./routes/teams/team-tags-simple";  // 削除済み（/tags?teamId=X で代替）
// import teamTaggingsRoute from "./routes/teams/team-taggings";  // 削除済み（/taggings?teamId=X で代替）
import clerkWebhook from "./routes/webhooks/clerk";
import usersRoute from "./routes/users/route";

const app = new OpenAPIHono();

// CORS設定を追加（管理画面からのアクセスを許可）
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3010", // アドミン画面（ローカル）
      "http://localhost:3030", // アドミン画面（本番データ）
      "http://localhost:7593",
      "https://petaboo.vercel.app",
      "https://*.vercel.app", // Vercelプレビューデプロイも許可
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-admin-token"],
    credentials: true,
  }),
);

// 手動でルートを登録
app.route("/comments", commentsRoute);
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
// app.route("/teams", teamTagsRoute);  // 削除済み（/tags?teamId=X で代替）
// app.route("/teams", teamTaggingsRoute);  // 削除済み（/taggings?teamId=X で代替）
app.route("/webhooks/clerk", clerkWebhook);
app.route("/users", usersRoute);

export default app;

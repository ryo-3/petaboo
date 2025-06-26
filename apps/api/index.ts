import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import openapiApp from "./src/openapi";
import notesRoute from "./src/routes/notes/route";

const app = new Hono();

console.log("サーバー起動！");

app.route("/notes", notesRoute);
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

serve({ fetch: app.fetch, port: 8787 });

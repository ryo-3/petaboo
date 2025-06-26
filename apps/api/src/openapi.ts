import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { z } from "zod";

const app = new OpenAPIHono();

// 例: /notes GET のみ定義（実装はroute.ts側と揃える）
app.openapi(
  createRoute({
    method: "get",
    path: "/notes",
    responses: {
      200: {
        description: "List of notes",
        content: {
          "application/json": {
            schema: z.array(
              z.object({
                id: z.number(),
                title: z.string(),
                content: z.string().nullable(),
                createdAt: z.number(),
              })
            ),
          },
        },
      },
    },
  }),
  async (c) => {
    // 実際のroute.tsと同じ実装内容は不要。ドキュメント用なのでreturnだけでOK
    return c.json([]);
  }
);

export default app;

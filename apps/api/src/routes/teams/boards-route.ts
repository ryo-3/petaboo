import { OpenAPIHono } from "@hono/zod-openapi";
import { createTeamBoardsAPI } from "./boards";
import type { Env } from "../../types/common";

const app = new OpenAPIHono<{ Bindings: Env }>();

// チーム用ボードAPIを登録
createTeamBoardsAPI(app);

export default app;

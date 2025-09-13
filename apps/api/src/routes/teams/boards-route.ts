import { Hono } from "hono";
import { createTeamBoardsAPI } from "./boards";

const app = new Hono();

// チーム用ボードAPIを登録
createTeamBoardsAPI(app);

export default app;

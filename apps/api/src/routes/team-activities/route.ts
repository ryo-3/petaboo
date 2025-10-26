import { OpenAPIHono } from "@hono/zod-openapi";
import { getTeamActivitiesRoute, getTeamActivities } from "./api";

const app = new OpenAPIHono();

app.openapi(getTeamActivitiesRoute, getTeamActivities);

export default app;

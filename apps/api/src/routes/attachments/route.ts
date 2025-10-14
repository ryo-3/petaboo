import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { registerAttachmentRoutes } from "./api";

const app = new OpenAPIHono();

// Middleware
app.use("*", clerkMiddleware());
app.use("*", databaseMiddleware);

// Register routes
registerAttachmentRoutes(app);

export default app;

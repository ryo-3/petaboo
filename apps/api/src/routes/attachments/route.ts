import { OpenAPIHono } from "@hono/zod-openapi";
import { clerkMiddleware } from "@hono/clerk-auth";
import { databaseMiddleware } from "../../middleware/database";
import { registerAttachmentRoutes } from "./api";

const app = new OpenAPIHono();

// CORS preflight handler
app.options("*", (c) => {
  const origin = c.req.header("Origin") || "http://localhost:7593";
  return c.text("", 204, {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  });
});

// Middleware
app.use("*", clerkMiddleware());
app.use("*", databaseMiddleware);

// Register routes
registerAttachmentRoutes(app);

export default app;

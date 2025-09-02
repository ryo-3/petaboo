import { createMiddleware } from "hono/factory";
import { createDatabase } from "../db/connection";

type DatabaseVariables = {
  db: ReturnType<typeof createDatabase>;
};

export const databaseMiddleware = createMiddleware<{
  Bindings: { DB: D1Database };
  Variables: DatabaseVariables;
}>(async (c, next) => {
  if (!c.env.DB) {
    throw new Error("D1 database binding is not available");
  }
  const db = createDatabase(c.env.DB);
  c.set("db", db);
  await next();
});

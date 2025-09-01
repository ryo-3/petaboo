import { createMiddleware } from "hono/factory";
import { createDatabase } from "../db/connection";

type DatabaseVariables = {
  db: ReturnType<typeof createDatabase>;
};

export const databaseMiddleware = createMiddleware<{
  Bindings: { DB?: D1Database };
  Variables: DatabaseVariables;
}>(async (c, next) => {
  const db = createDatabase(c.env?.DB);
  c.set("db", db);
  await next();
});

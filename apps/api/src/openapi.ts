// apps/api/src/openapi.ts
import { OpenAPIHono } from "@hono/zod-openapi";
import { readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";

const app = new OpenAPIHono();

async function loadRoutesRecursively(baseDir: string, currentDir = "") {
  const fullDir = resolve(baseDir, currentDir);
  const entries = await readdir(fullDir);

  for (const entry of entries) {
    const entryPath = join(fullDir, entry);
    const stats = await stat(entryPath);

    if (stats.isDirectory()) {
      await loadRoutesRecursively(baseDir, join(currentDir, entry));
    } else if (entry === "route.ts") {
      const routePath = "/" + currentDir.replace(/\\/g, "/");
      const fullModulePath = "file://" + join(fullDir, entry);
      const module = await import(fullModulePath);
      const routeApp = module.default;

      if (routeApp) {
        app.route(routePath, routeApp);
      }
    }
  }
}

await loadRoutesRecursively(resolve("./src/routes"));

export default app;

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "../../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/b552c84253909ac4579a660cc73518f79ddeb2673e2cc79d8326d3aafc4dc36e.sqlite",
  },
});
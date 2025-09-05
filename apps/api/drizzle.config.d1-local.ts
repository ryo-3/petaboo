import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "d1-http",
  dbCredentials: {
    accountId: "e7ede1cb0525601a97c71931146a6696",
    databaseId: "7de21e56-0d26-4204-8563-a57bca0772b4",
    token: process.env.CLOUDFLARE_D1_TOKEN || "placeholder_token",
  },
});
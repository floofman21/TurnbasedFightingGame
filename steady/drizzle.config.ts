import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migrations need a direct (unpooled) connection when one is available.
    url:
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.NETLIFY_DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL ||
      process.env.NETLIFY_DATABASE_URL!,
  },
  strict: true,
});

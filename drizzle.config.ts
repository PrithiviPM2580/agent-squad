import { defineConfig } from "drizzle-kit";
import { normalizeDatabaseUrl } from "./src/lib/database-url";

process.loadEnvFile(".env");

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: normalizeDatabaseUrl(process.env.DATABASE_URL!),
  },
});

import { defineConfig } from "drizzle-kit";

process.loadEnvFile(".env");

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  casing: "snake_case",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

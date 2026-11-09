import { parseEnv } from "@neon/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { normalizeDatabaseUrl } from "@/lib/database-url";
import config from "@/neon";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: Pool };

function createPool() {
  const { postgres } = parseEnv(config, ["DATABASE_URL"]);

  return new Pool({
    connectionString: normalizeDatabaseUrl(postgres.databaseUrl),
  });
}

const pool = globalForDb.pool ?? createPool();

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle({ client: pool, schema, casing: "snake_case" });

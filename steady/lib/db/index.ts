import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Reuse one client across hot reloads in dev. `prepare: false` keeps this safe
// behind Neon's pooled (PgBouncer) connection string.
const globalForDb = globalThis as unknown as { steadySql?: postgres.Sql };
const client = globalForDb.steadySql ?? postgres(url, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.steadySql = client;

export const db = drizzle(client, { schema });
export { schema };

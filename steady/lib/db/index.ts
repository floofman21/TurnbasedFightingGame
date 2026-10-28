import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Netlify DB (Neon) provides NETLIFY_DATABASE_URL; DATABASE_URL wins when both are set.
const url = process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL;
if (!url) throw new Error("DATABASE_URL (or NETLIFY_DATABASE_URL) is not set");

// Reuse one client across hot reloads in dev. `prepare: false` keeps this safe
// behind Neon's pooled (PgBouncer) connection string.
const globalForDb = globalThis as unknown as { steadySql?: postgres.Sql };
const client = globalForDb.steadySql ?? postgres(url, { prepare: false, max: 5 });
if (process.env.NODE_ENV !== "production") globalForDb.steadySql = client;

export const db = drizzle(client, { schema });
export { schema };

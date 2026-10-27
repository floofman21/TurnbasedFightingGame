import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type Viewer = {
  person: typeof schema.people.$inferSelect;
  org: typeof schema.organizations.$inferSelect;
};

/**
 * The signed-in person.
 *
 * PHASE 1 STUB: there is no auth yet, so this returns the org's first HR admin
 * (the seed creates one). Phase 3 replaces the body with the Auth.js session
 * lookup and redirects to /sign-in when there is no linked person.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  // Always render per request (the session cookie will do this from Phase 3).
  await connection();
  const rows = await db
    .select({ person: schema.people, org: schema.organizations })
    .from(schema.people)
    .innerJoin(schema.organizations, eq(schema.organizations.id, schema.people.orgId))
    .where(eq(schema.people.role, "hr_admin"))
    .limit(1);
  return rows[0] ?? null;
});

/** Managers and HR admins see the dashboard and feed; everyone else only checks in. */
export function canSeeDashboard(viewer: Viewer) {
  return viewer.person.role === "manager" || viewer.person.role === "hr_admin";
}

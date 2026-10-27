import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { computeIndices, isAtRisk } from "@/lib/scoring";

/**
 * Latest check-in for every active person in the org.
 * Phase 3 narrows this to the people the viewer may see (lib/permissions.ts).
 */
export async function latestCheckins(orgId: string) {
  const { checkins, people } = schema;
  return db
    .selectDistinctOn([checkins.personId], {
      personId: checkins.personId,
      weekStart: checkins.weekStart,
      mood: checkins.mood,
      energy: checkins.energy,
      stress: checkins.stress,
      workload: checkins.workload,
      belonging: checkins.belonging,
    })
    .from(checkins)
    .innerJoin(people, eq(people.id, checkins.personId))
    .where(and(eq(people.orgId, orgId), eq(people.active, true)))
    .orderBy(checkins.personId, sql`${checkins.weekStart} desc`);
}

export async function countAtRisk(orgId: string) {
  const rows = await latestCheckins(orgId);
  return rows.filter((r) => isAtRisk(computeIndices(r))).length;
}

/** People with a check-in in `weekStart` ÷ active people. */
export async function participation(orgId: string, weekStart: string) {
  const { checkins, people } = schema;
  const [row] = await db
    .select({
      active: sql<number>`count(*)::int`,
      checkedIn: sql<number>`count(${checkins.id})::int`,
    })
    .from(people)
    .leftJoin(checkins, and(eq(checkins.personId, people.id), eq(checkins.weekStart, weekStart)))
    .where(and(eq(people.orgId, orgId), eq(people.active, true)));
  return row;
}

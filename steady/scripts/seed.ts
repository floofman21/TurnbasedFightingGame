// pnpm db:seed — loads the prototype's sample org into a local or preview database.
// Replaces ALL org data. Refuses to run against production.

import "dotenv/config";
import { generateSamplePeople, SAMPLE_DEPARTMENTS, SAMPLE_WEEKS } from "./sample-data";
import { recentWeeks, weekStartOf, addDays } from "../lib/week";

if (process.env.CONTEXT === "production" || process.env.NODE_ENV === "production") {
  console.error("Refusing to seed a production database.");
  process.exit(1);
}

const TIMEZONE = process.env.SEED_TIMEZONE ?? "America/New_York";
const EMAIL_DOMAIN = (process.env.ALLOWED_EMAIL_DOMAINS ?? "example.com").split(",")[0].trim() || "example.com";

async function main() {
  const { db, schema } = await import("../lib/db");
  const { sql } = await import("drizzle-orm");
  const now = new Date();
  // Anchor the sample's last week to the current week so "this week" has data.
  const weeks = recentWeeks(weekStartOf(now, TIMEZONE), SAMPLE_WEEKS);
  const sample = generateSamplePeople(EMAIL_DOMAIN);

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`truncate table audit_log, reminders_log, checkins, teams, people, departments, organizations restart identity cascade`,
    );

    const [org] = await tx
      .insert(schema.organizations)
      .values({ name: "Arkone", timezone: TIMEZONE, weekStartDay: 1, minGroupSize: 5 })
      .returning();

    const deptIds = new Map<string, string>();
    const teamIds = new Map<string, string>();
    for (const [deptName, def] of Object.entries(SAMPLE_DEPARTMENTS)) {
      const [dept] = await tx
        .insert(schema.departments)
        .values({ orgId: org.id, name: deptName })
        .returning();
      deptIds.set(deptName, dept.id);
      for (const teamName of def.teams) {
        const [team] = await tx
          .insert(schema.teams)
          .values({ departmentId: dept.id, name: teamName })
          .returning();
        teamIds.set(teamName, team.id);
      }
    }

    // The first person listed on each team manages it; HR's first person is the HR admin.
    const managerOf = new Map<string, number>();
    for (const p of sample) if (!managerOf.has(p.team)) managerOf.set(p.team, p.index);
    const hrAdminIndex = sample.find((p) => p.dept === "HR")!.index;

    const inserted = await tx
      .insert(schema.people)
      .values(
        sample.map((p) => ({
          orgId: org.id,
          teamId: teamIds.get(p.team)!,
          employeeCode: p.employeeCode,
          name: p.name,
          email: p.email,
          role:
            p.index === hrAdminIndex
              ? ("hr_admin" as const)
              : managerOf.get(p.team) === p.index
                ? ("manager" as const)
                : ("employee" as const),
        })),
      )
      .returning({ id: schema.people.id, employeeCode: schema.people.employeeCode });
    const personId = new Map(inserted.map((r) => [r.employeeCode, r.id]));

    for (const [teamName, index] of managerOf) {
      await tx
        .update(schema.teams)
        .set({ managerId: personId.get(sample[index].employeeCode)! })
        .where(sql`${schema.teams.id} = ${teamIds.get(teamName)!}`);
    }

    const rows = sample.flatMap((p) =>
      p.checkins.flatMap((c, w) => {
        if (!c) return [];
        // Spread submissions across Mon–Fri at 10:00 org-ish time, never in the future.
        const at = new Date(`${addDays(weeks[w], c.day)}T15:00:00Z`);
        const submittedAt = at > now ? now : at;
        return [
          {
            personId: personId.get(p.employeeCode)!,
            weekStart: weeks[w],
            mood: c.mood,
            energy: c.energy,
            stress: c.stress,
            workload: c.workload,
            belonging: c.belonging,
            note: c.note,
            noteShared: c.shared,
            submittedAt,
            updatedAt: submittedAt,
          },
        ];
      }),
    );
    await tx.insert(schema.checkins).values(rows);

    console.log(
      `Seeded org "${org.name}": ${deptIds.size} departments, ${teamIds.size} teams, ` +
        `${inserted.length} people, ${rows.length} check-ins over ${SAMPLE_WEEKS} weeks ` +
        `(${weeks[0]} → ${weeks[weeks.length - 1]}).`,
    );
  });

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

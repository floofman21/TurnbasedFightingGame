"use server";

import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db";
import { checkinSchema } from "@/lib/checkin";
import { getViewer } from "@/lib/viewer";
import { weekStartOf } from "@/lib/week";

export type SubmitResult = { ok: true; weekStart: string } | { ok: false; error: string };

/** Upsert the signed-in person's check-in for the current week in the org's time zone. */
export async function submitCheckin(input: unknown): Promise<SubmitResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "You need to sign in to check in." };

  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Please answer all five questions." };
  }

  const { person, org } = viewer;
  // The week is decided on the server, never taken from the client.
  const weekStart = weekStartOf(new Date(), org.timezone, org.weekStartDay);
  const values = parsed.data;
  const now = new Date();

  await db
    .insert(schema.checkins)
    .values({ personId: person.id, weekStart, ...values, submittedAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: [schema.checkins.personId, schema.checkins.weekStart],
      set: { ...values, updatedAt: now },
    });

  revalidatePath("/", "layout");
  return { ok: true, weekStart };
}

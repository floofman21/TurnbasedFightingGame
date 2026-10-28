import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { CheckinForm } from "@/components/checkin/checkin-form";
import { PageHeader } from "@/components/shared/page-header";
import { getMyHistory } from "@/lib/queries";
import { computeIndices } from "@/lib/scoring";
import { getViewer } from "@/lib/viewer";
import { formatWeekShort, recentWeeks, weekStartOf } from "@/lib/week";

export const metadata: Metadata = { title: "Weekly Check-in" };

export default async function CheckInPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  const { person, org } = viewer;

  const current = weekStartOf(new Date(), org.timezone, org.weekStartDay);
  const history = await getMyHistory(person.id, recentWeeks(current, 8));
  const mine = history[history.length - 1].checkin;

  return (
    <>
      <PageHeader title="Weekly Check-in">
        Five quick questions about your week. Takes about a minute.
      </PageHeader>
      <p className="-mt-3 mb-5 flex max-w-[65ch] items-start gap-2 text-[13px] text-muted-foreground">
        <LockKeyhole className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          Your manager and HR can see your scores. Your note is only visible to them if you choose to share it.
        </span>
      </p>
      <CheckinForm
        // Remount with fresh state after a save so the form reflects what was stored.
        key={mine?.updatedAt.toISOString() ?? "new"}
        firstName={person.name.split(" ")[0]}
        weekLabel={formatWeekShort(current)}
        existing={
          mine && {
            mood: mine.mood,
            energy: mine.energy,
            stress: mine.stress,
            workload: mine.workload,
            belonging: mine.belonging,
            note: mine.note,
            noteShared: mine.noteShared,
          }
        }
        history={history.map((h) => ({ weekStart: h.weekStart, indices: h.checkin && computeIndices(h.checkin) }))}
      />
    </>
  );
}

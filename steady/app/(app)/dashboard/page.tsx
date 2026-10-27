import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";
import { participation } from "@/lib/queries";
import { canSeeDashboard, getViewer } from "@/lib/viewer";
import { weekStartOf } from "@/lib/week";

export const metadata: Metadata = { title: "Health Dashboard" };

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (!canSeeDashboard(viewer)) redirect("/check-in");

  const { org } = viewer;
  const { active, checkedIn } = await participation(org.id, weekStartOf(new Date(), org.timezone, org.weekStartDay));
  const pct = active ? Math.round((checkedIn / active) * 100) : 0;

  return (
    <>
      <PageHeader title="Health Dashboard">
        <span className="num">{checkedIn}</span> of <span className="num">{active}</span> employees checked in this
        week (<span className="num">{pct}%</span> participation). Indices are built from five 1–5 check-in questions
        and shown on a 0–100 scale.
      </PageHeader>
      <ComingSoon
        phase={4}
        items={[
          "Four KPI cards with week-over-week deltas and 8-week sparklines",
          "Breakdown by people needing attention, team and department",
          "Searchable, sortable employee table with a person drawer",
        ]}
      />
    </>
  );
}

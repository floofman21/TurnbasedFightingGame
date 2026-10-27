import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (viewer.person.role !== "hr_admin") redirect("/check-in");
  return (
    <>
      <PageHeader title="People">Manage the roster, roles and teams.</PageHeader>
      <ComingSoon
        phase={5}
        items={["Roster table with role and team editing", "CSV import with a row-level error preview"]}
      />
    </>
  );
}

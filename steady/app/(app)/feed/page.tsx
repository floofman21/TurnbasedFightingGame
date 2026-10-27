import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";
import { canSeeDashboard, getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Check-in Feed" };

export default async function FeedPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  if (!canSeeDashboard(viewer)) redirect("/check-in");
  return (
    <>
      <PageHeader title="Check-in Feed">
        Check-ins from this week and last, newest first. Private notes are hidden; only scores are shown for those.
      </PageHeader>
      <ComingSoon phase={4} items={["This and last week’s check-ins", "Department and “With shared notes” filters"]} />
    </>
  );
}

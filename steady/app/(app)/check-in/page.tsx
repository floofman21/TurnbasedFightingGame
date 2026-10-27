import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";

export const metadata: Metadata = { title: "Weekly Check-in" };

export default function CheckInPage() {
  return (
    <>
      <PageHeader title="Weekly Check-in">
        Five quick questions about your week. Takes about a minute. Your answers feed the team’s wellbeing indices;
        notes are only visible to your manager if you choose to share them.
      </PageHeader>
      <ComingSoon
        phase={2}
        items={[
          "Five 1–5 questions with keyboard support",
          "Optional note with a “share with my manager” choice",
          "Live index preview and your own 8-week history",
        ]}
      />
    </>
  );
}

import { redirect } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { navFor } from "@/components/shell/nav";
import { countAtRisk } from "@/lib/queries";
import { canSeeDashboard, getViewer } from "@/lib/viewer";
import { formatWeekLong, weekStartOf } from "@/lib/week";

const ROLE_LABEL = { employee: "Employee", manager: "Manager", hr_admin: "HR admin" } as const;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");
  const { person, org } = viewer;

  const atRisk = canSeeDashboard(viewer) ? await countAtRisk(org.id) : 0;
  const nav = navFor(person.role).map((item) => ({
    href: item.href,
    label: item.label,
    badge: item.badge === "atRisk" ? atRisk : undefined,
  }));
  const week = weekStartOf(new Date(), org.timezone, org.weekStartDay);

  return (
    <AppShell
      orgName={org.name}
      user={{ name: person.name, subtitle: ROLE_LABEL[person.role] }}
      nav={nav}
      weekLabel={formatWeekLong(week)}
    >
      {children}
    </AppShell>
  );
}

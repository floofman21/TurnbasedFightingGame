import type { Role } from "@/lib/db/schema";

export type NavItem = {
  href: string;
  label: string;
  roles: Role[];
  badge?: "atRisk";
};

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Health Dashboard", roles: ["manager", "hr_admin"] },
  { href: "/check-in", label: "Weekly Check-in", roles: ["employee", "manager", "hr_admin"] },
  { href: "/feed", label: "Check-in Feed", roles: ["manager", "hr_admin"], badge: "atRisk" },
  { href: "/admin/people", label: "People", roles: ["hr_admin"] },
];

export function navFor(role: Role) {
  return NAV.filter((item) => item.roles.includes(role));
}

export function titleFor(pathname: string) {
  return NAV.find((item) => pathname === item.href || pathname.startsWith(item.href + "/"))?.label ?? "Steady";
}

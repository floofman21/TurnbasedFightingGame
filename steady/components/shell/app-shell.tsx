"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { LogOut, Minus, Monitor, Moon, PanelLeft, Sun } from "lucide-react";
import { Logo } from "./logo";
import { titleFor } from "./nav";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { cn, initials } from "@/lib/utils";

type ShellNavItem = { href: string; label: string; badge?: number };

type AppShellProps = {
  orgName: string;
  user: { name: string; subtitle: string };
  nav: ShellNavItem[];
  weekLabel: string;
  children: React.ReactNode;
};

const NAV_QUERY = "(min-width: 860px)";

export function AppShell({ orgName, user, nav, weekLabel, children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const toggle = () => {
    if (window.matchMedia(NAV_QUERY).matches) setCollapsed((c) => !c);
    else setMobileOpen((o) => !o);
  };

  const sidebar = (
    <SidebarContent
      orgName={orgName}
      user={user}
      nav={nav}
      pathname={pathname}
      onNavigate={() => setMobileOpen(false)}
    />
  );

  return (
    <div
      className={cn(
        "grid min-h-full grid-cols-[minmax(0,1fr)]",
        collapsed ? "nav:grid-cols-[0_minmax(0,1fr)]" : "nav:grid-cols-[244px_minmax(0,1fr)]",
      )}
    >
      <aside
        aria-label="Main navigation"
        className={cn(
          "sticky top-0 hidden h-screen flex-col overflow-auto border-r border-border bg-sunk px-3 pt-[18px] pb-3.5 nav:flex",
          collapsed && "invisible",
        )}
      >
        {sidebar}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" showClose={false} className="px-3 pt-[18px] pb-3.5" aria-label="Main navigation">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">Steady navigation</SheetDescription>
          {sidebar}
        </SheetContent>
      </Sheet>

      <main className="min-w-0 px-4 pt-[18px] pb-10 nav:px-6">
        <div className="mb-[22px] flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle sidebar"
            className="grid size-8 place-items-center rounded-[7px] border border-transparent text-muted-foreground hover:border-border hover:bg-surface hover:text-foreground"
          >
            <PanelLeft className="size-[18px]" strokeWidth={1.8} />
          </button>
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 border-l border-border pl-3 text-muted-foreground">
            <span className="max-[520px]:hidden">Steady</span>
            <span className="max-[520px]:hidden" aria-hidden="true">
              ›
            </span>
            <b className="font-semibold text-foreground" aria-current="page">
              {titleFor(pathname)}
            </b>
          </nav>
          <div className="flex-1" />
          <span className="rounded-full border border-border bg-surface px-[11px] py-[5px] text-[12.5px] whitespace-nowrap text-muted-foreground max-[520px]:hidden">
            Week of {weekLabel}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
}

function SidebarContent({
  orgName,
  user,
  nav,
  pathname,
  onNavigate,
}: Omit<AppShellProps, "children" | "weekLabel"> & { pathname: string; onNavigate: () => void }) {
  const [groupOpen, setGroupOpen] = React.useState(true);
  return (
    <>
      <div className="flex items-center gap-2.5 px-2 pt-1 pb-[22px]">
        <Logo />
        <div>
          <b className="block font-display text-base leading-[1.1] font-semibold">Steady</b>
          <small className="text-xs text-muted-foreground">{orgName}</small>
        </div>
      </div>

      <nav className="mb-1.5">
        <button
          type="button"
          onClick={() => setGroupOpen((o) => !o)}
          aria-expanded={groupOpen}
          className="flex w-full items-center justify-between rounded-[7px] p-2 text-left font-medium hover:bg-surface"
        >
          <span>Wellbeing</span>
          <Minus className={cn("size-4 text-muted-foreground transition-transform", !groupOpen && "rotate-90")} />
        </button>
        {groupOpen && (
          <ul className="mt-0.5 mb-1.5 ml-3.5 flex flex-col gap-0.5 border-l border-border pl-2.5">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center justify-between rounded-[7px] px-2.5 py-[7px] text-muted-foreground hover:bg-surface hover:text-foreground",
                      active && "bg-surface font-semibold text-foreground shadow-card",
                    )}
                  >
                    {item.label}
                    {!!item.badge && (
                      <span
                        className="rounded-full bg-bad-soft px-[7px] py-px text-[11px] font-semibold text-bad"
                        title={`${item.badge} at risk`}
                      >
                        {item.badge}
                        <span className="sr-only"> at risk</span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-border px-2 pt-3">
        <span className="grid size-7 flex-none place-items-center rounded-full bg-brand-soft text-[11px] font-semibold text-brand">
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <b className="block truncate text-[13px]">{user.name}</b>
          <small className="text-xs text-muted-foreground">{user.subtitle}</small>
        </div>
        <ThemeToggle />
        {/* Phase 3 wires this to Auth.js signOut(). */}
        <Link
          href="/sign-in"
          aria-label="Sign out"
          title="Sign out"
          className="grid size-8 place-items-center rounded-[7px] text-muted-foreground hover:bg-surface hover:text-foreground"
        >
          <LogOut className="size-4" />
        </Link>
      </div>
    </>
  );
}

const THEMES = ["system", "light", "dark"] as const;
const noopSubscribe = () => () => {};

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client; render "system" on the server.
  const mounted = React.useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const current = mounted ? ((theme as (typeof THEMES)[number]) ?? "system") : "system";
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  const Icon = current === "light" ? Sun : current === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${current}. Switch to ${next}.`}
      title={`Theme: ${current}`}
      className="grid size-8 place-items-center rounded-[7px] text-muted-foreground hover:bg-surface hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}

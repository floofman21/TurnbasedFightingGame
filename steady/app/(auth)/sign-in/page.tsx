import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <main className="grid min-h-full place-items-center px-4 py-10">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-5 flex items-center gap-2.5">
          <Logo />
          <b className="font-display text-lg font-semibold">Steady</b>
        </div>
        <h1 className="mb-1 font-display text-[22px] font-semibold">Sign in</h1>
        <p className="mb-5 text-muted-foreground">
          Google and Microsoft sign-in arrive in phase 3. Until then the app runs as the seeded HR admin.
        </p>
        <Link href="/" className="font-semibold text-brand">
          Continue to Steady →
        </Link>
      </Card>
    </main>
  );
}

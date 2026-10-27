// Vercel runs `vercel-build` instead of `build` when it exists.
// Per the spec, migrations run in the build step for production only.
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "production") {
  run("pnpm drizzle-kit migrate");
} else {
  console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}).`);
}
run("pnpm next build");

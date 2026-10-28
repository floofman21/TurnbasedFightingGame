// Netlify build: apply database migrations on production deploys only, then build.
// Deploy previews and branch deploys skip migrations (CONTEXT is set by Netlify).
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });

if (process.env.CONTEXT === "production") {
  run("pnpm drizzle-kit migrate");
} else {
  console.log(`Skipping migrations (CONTEXT=${process.env.CONTEXT ?? "unset"}).`);
}
run("pnpm next build");

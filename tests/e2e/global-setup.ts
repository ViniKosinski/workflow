import { execFileSync } from "node:child_process";

export default function globalSetup() {
  const databaseUrl = process.env.TEST_DATABASE_URL ?? "postgresql://CodexSandboxOffline@127.0.0.1:55432/workflow_test?schema=public";
  execFileSync(process.execPath, ["scripts/seed-purchase-pilot.mjs"], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl }, stdio: "inherit" });
}

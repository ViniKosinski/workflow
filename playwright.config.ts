import { defineConfig, devices } from "@playwright/test";

const databaseUrl = process.env.TEST_DATABASE_URL ?? "postgresql://CodexSandboxOffline@127.0.0.1:55432/workflow_test?schema=public";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 180_000,
  reporter: "list",
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure", actionTimeout: 10_000, navigationTimeout: 20_000 },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100",
    url: "http://localhost:3100/login",
    reuseExistingServer: true,
    timeout: 120_000,
    env: { DATABASE_URL: databaseUrl, AUTH_ALLOWED_ORIGINS: "http://localhost:3100,http://127.0.0.1:3100" },
  },
});

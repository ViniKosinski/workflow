import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const databaseUrl =
  testDatabaseUrl ??
  process.env.DATABASE_URL ??
  "postgresql://workflow_test:workflow_test@localhost:5432/workflow_test_unconfigured";
const tests = spawnSync(
  npmCommand,
  ["exec", "--", "vitest", "run", ...process.argv.slice(2)],
  {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  },
);

if (tests.error) {
  console.error(`Não foi possível executar os testes: ${tests.error.message}`);
  process.exit(1);
}

process.exit(tests.status ?? 1);

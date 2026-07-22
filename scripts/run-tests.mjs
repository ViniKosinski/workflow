import { spawnSync } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const tests = spawnSync(
  npmCommand,
  ["exec", "--", "vitest", "run", ...process.argv.slice(2)],
  {
    env: {
      ...process.env,
      DATABASE_URL: testDatabaseUrl ?? process.env.DATABASE_URL,
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

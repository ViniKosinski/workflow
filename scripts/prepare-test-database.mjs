import { spawnSync } from "node:child_process";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  console.log("TEST_DATABASE_URL não definida; migrations de integração ignoradas.");
  process.exit(0);
}

let parsedUrl;
try {
  parsedUrl = new URL(testDatabaseUrl);
} catch {
  console.error("TEST_DATABASE_URL deve ser uma URL PostgreSQL válida.");
  process.exit(1);
}

const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ""));
if (!databaseName || !databaseName.toLowerCase().includes("test")) {
  console.error("TEST_DATABASE_URL deve apontar para um banco cujo nome contenha 'test'.");
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const commandOptions = {
  env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  shell: process.platform === "win32",
  stdio: "inherit",
};

const generation = spawnSync(
  npmCommand,
  ["exec", "--", "prisma", "generate"],
  commandOptions,
);

if (generation.error) {
  console.error(`Não foi possível gerar o Prisma Client: ${generation.error.message}`);
  process.exit(1);
}

if (generation.status !== 0) {
  process.exit(generation.status ?? 1);
}

const migration = spawnSync(
  npmCommand,
  ["exec", "--", "prisma", "migrate", "deploy"],
  commandOptions,
);

if (migration.error) {
  console.error(`Não foi possível executar as migrations: ${migration.error.message}`);
  process.exit(1);
}

process.exit(migration.status ?? 1);

import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("organization migration backfill", () => {
  it("preserva workflow anterior e cria organização, autoria e membership", async () => {
    const connectionUrl = new URL(databaseUrl!);
    connectionUrl.searchParams.delete("schema");
    const client = new Client({ connectionString: connectionUrl.toString() });
    const schema = `migration_${crypto.randomUUID().replaceAll("-", "_")}`;
    const migrationPaths = [
      "20260721100000_init_workflow_persistence",
      "20260721200000_add_auth_and_workflow_ownership",
      "20260722100000_sprint_4_1_hardening",
      "20260722140000_add_organizations_and_roles",
      "20260722150000_enforce_single_organization_owner",
      "20260723100000_add_workflow_optimistic_version",
    ];

    await client.connect();
    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      for (const migration of migrationPaths.slice(0, 3)) {
        await client.query(await readFile(path.join(process.cwd(), "prisma", "migrations", migration, "migration.sql"), "utf8"));
      }
      await client.query(`
        INSERT INTO users (id, email, normalized_email, name, updated_at)
        VALUES ('existing-user', 'existing@test.invalid', 'existing@test.invalid', 'Existing', CURRENT_TIMESTAMP);
        INSERT INTO workflow_definitions (id, owner_user_id, name, updated_at)
        VALUES ('existing-workflow', 'existing-user', 'Existing workflow', CURRENT_TIMESTAMP);
      `);
      for (const migration of migrationPaths.slice(3)) {
        await client.query(await readFile(path.join(process.cwd(), "prisma", "migrations", migration, "migration.sql"), "utf8"));
      }

      const workflow = await client.query("SELECT organization_id, created_by_user_id, version FROM workflow_definitions WHERE id = 'existing-workflow'");
      expect(workflow.rows[0]).toEqual({ organization_id: "existing-user", created_by_user_id: "existing-user", version: 1 });
      await expect(client.query("SELECT 1 FROM organizations WHERE id = 'existing-user'")).resolves.toMatchObject({ rowCount: 1 });
      await expect(client.query("SELECT role FROM organization_memberships WHERE organization_id = 'existing-user' AND user_id = 'existing-user'")).resolves.toMatchObject({ rows: [{ role: "owner" }] });

      await client.query("INSERT INTO users (id, email, normalized_email, name, updated_at) VALUES ('second-user', 'second@test.invalid', 'second@test.invalid', 'Second', CURRENT_TIMESTAMP)");
      await expect(client.query("INSERT INTO organization_memberships (organization_id, user_id, role, updated_at) VALUES ('existing-user', 'second-user', 'owner', CURRENT_TIMESTAMP)"))
        .rejects.toMatchObject({ code: "23505" });
    } finally {
      await client.query("RESET search_path");
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await client.end();
    }
  });
});

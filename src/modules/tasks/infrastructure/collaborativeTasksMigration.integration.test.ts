import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("collaborative tasks migration", () => {
  it("preserva histórico e aplica responsável e prioridade ao definition e run step", async () => {
    const connectionUrl = new URL(databaseUrl!);
    connectionUrl.searchParams.delete("schema");
    const client = new Client({ connectionString: connectionUrl.toString() });
    const schema = `tasks_migration_${crypto.randomUUID().replaceAll("-", "_")}`;
    const before = [
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
      for (const migration of before) await client.query(await readFile(path.join(process.cwd(), "prisma", "migrations", migration, "migration.sql"), "utf8"));
      await client.query(`
        INSERT INTO users (id, email, normalized_email, name, updated_at) VALUES ('legacy-user', 'legacy@test.invalid', 'legacy@test.invalid', 'Legacy', CURRENT_TIMESTAMP);
        INSERT INTO organizations (id, name, updated_at) VALUES ('legacy-org', 'Legacy org', CURRENT_TIMESTAMP);
        INSERT INTO organization_memberships (organization_id, user_id, role, updated_at) VALUES ('legacy-org', 'legacy-user', 'owner', CURRENT_TIMESTAMP);
        INSERT INTO workflow_definitions (id, organization_id, created_by_user_id, name, updated_at) VALUES ('legacy-flow', 'legacy-org', 'legacy-user', 'Legacy flow', CURRENT_TIMESTAMP);
        INSERT INTO workflow_definition_steps (id, workflow_definition_id, name, "order", updated_at) VALUES ('legacy-step', 'legacy-flow', 'Legacy step', 1, CURRENT_TIMESTAMP);
        INSERT INTO workflow_runs (id, workflow_definition_id, status, current_step_id, updated_at) VALUES ('legacy-flow', 'legacy-flow', 'running', NULL, CURRENT_TIMESTAMP);
        INSERT INTO workflow_run_steps (id, workflow_run_id, workflow_definition_step_id, name, "order", status, updated_at) VALUES ('legacy-step', 'legacy-flow', 'legacy-step', 'Legacy step', 1, 'pending', CURRENT_TIMESTAMP);
        UPDATE workflow_runs SET current_step_id = 'legacy-step' WHERE id = 'legacy-flow';
        INSERT INTO workflow_execution_events (id, workflow_run_id, event_type, event_scope, message, occurred_at) VALUES ('legacy-event', 'legacy-flow', 'execution.started', 'workflow', 'Started', CURRENT_TIMESTAMP);
      `);
      for (const migration of ["20260724100000_add_collaborative_tasks", "20260725100000_enforce_step_assignee_integrity", "20260726100000_add_workflow_transitions"]) {
        await client.query(await readFile(path.join(process.cwd(), "prisma", "migrations", migration, "migration.sql"), "utf8"));
      }
      await expect(client.query("SELECT assignee_type, assignee_user_id, assignee_role, priority FROM workflow_definition_steps WHERE id = 'legacy-step'"))
        .resolves.toMatchObject({ rows: [{ assignee_type: "user", assignee_user_id: "legacy-user", assignee_role: null, priority: "normal" }] });
      await expect(client.query("SELECT assignee_type, assignee_user_id, assignee_role, priority FROM workflow_run_steps WHERE id = 'legacy-step'"))
        .resolves.toMatchObject({ rows: [{ assignee_type: "user", assignee_user_id: "legacy-user", assignee_role: null, priority: "normal" }] });
      await expect(client.query("SELECT id, message FROM workflow_execution_events WHERE id = 'legacy-event'"))
        .resolves.toMatchObject({ rows: [{ id: "legacy-event", message: "Started" }] });
      await expect(client.query("SELECT name, result, target_step_id, ends_workflow FROM workflow_definition_transitions WHERE source_step_id = 'legacy-step'"))
        .resolves.toMatchObject({ rows: [{ name: "Concluir", result: "completed", target_step_id: null, ends_workflow: true }] });
      await expect(client.query("UPDATE workflow_run_steps SET assignee_user_id = NULL WHERE id = 'legacy-step'"))
        .rejects.toMatchObject({ code: "23514" });
    } finally {
      await client.query("RESET search_path");
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await client.end();
    }
  });
});

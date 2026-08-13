import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

let cookieToken: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => name.includes("session") && cookieToken ? { value: cookieToken } : undefined,
    set: vi.fn(),
  }),
}));

import { POST as createDefinition } from "@/app/api/workflow-definitions/route";
import { POST as publishDefinition } from "@/app/api/workflow-definitions/[id]/publish/route";
import { POST as createRun } from "@/app/api/workflow-definitions/[id]/runs/route";
import { GET as listRuns } from "@/app/api/workflow-runs/route";
import { GET as getDefinitionForm } from "@/app/api/workflow-definitions/[id]/form/route";
import { POST as addFormField } from "@/app/api/workflow-definitions/[id]/form/fields/route";
import { PATCH as updateFormField, DELETE as removeFormField } from "@/app/api/workflow-definitions/[id]/form/fields/[fieldId]/route";
import { PATCH as reorderForm } from "@/app/api/workflow-definitions/[id]/form/reorder/route";
import { GET as getRunForm } from "@/app/api/workflow-runs/[id]/form/route";
import { PATCH as updateRunValues } from "@/app/api/workflow-runs/[id]/form/values/route";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);
const origin = "http://localhost";

integration("workflow definition HTTP lifecycle", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const userId = `definition-api-user-${suffix}`;
  const otherOrganizationId = `definition-api-other-${suffix}`;
  const token = `definition-api-token-${suffix}`;
  const definitionIds: string[] = [];

  const request = (url: string, method: string, body?: unknown) => new Request(url, {
    method,
    headers: { origin, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  beforeAll(async () => {
    cookieToken = token;
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid`, normalizedEmail: `${userId}@test.invalid`, name: "Definition API" } });
    await prisma.userCredential.create({ data: { userId, passwordHash: "hash" } });
    await prisma.authSession.create({
      data: {
        id: `definition-api-session-${suffix}`,
        userId,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await prisma.organization.create({ data: { id: userId, name: "Definition API" } });
    await prisma.organization.create({ data: { id: otherOrganizationId, name: "Other tenant" } });
    await prisma.organizationMembership.create({ data: { organizationId: userId, userId, role: "OWNER" } });
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { workflowDefinition: { organizationId: userId } } });
    await prisma.workflowDefinition.deleteMany({ where: { organizationId: userId } });
    await prisma.organization.deleteMany({ where: { id: { in: [userId, otherOrganizationId] } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("cria, publica e inicia múltiplas execuções da mesma revisão", async () => {
    const firstStepId = crypto.randomUUID();
    const secondStepId = crypto.randomUUID();
    const createdResponse = await createDefinition(request(`${origin}/api/workflow-definitions`, "POST", {
      name: "Processo HTTP",
      steps: [
        {
          id: firstStepId,
          name: "Análise",
          order: 1,
          assignee: { type: "role", role: "owner" },
          transitions: [{ id: crypto.randomUUID(), name: "Continuar", result: "continue", targetStepId: secondStepId, endsWorkflow: false }],
        },
        {
          id: secondStepId,
          name: "Finalização",
          order: 2,
          assignee: { type: "role", role: "owner" },
          transitions: [{ id: crypto.randomUUID(), name: "Finalizar", result: "done", endsWorkflow: true }],
        },
      ],
    }));
    expect(createdResponse.status).toBe(201);
    const definition = (await createdResponse.json()).definition;
    definitionIds.push(definition.id);
    const context = { params: Promise.resolve({ id: definition.id }) };
    expect((await publishDefinition(request(`${origin}/api/workflow-definitions/${definition.id}/publish`, "POST"), context)).status).toBe(200);
    const firstRunResponse = await createRun(request(`${origin}/api/workflow-definitions/${definition.id}/runs`, "POST"), context);
    const secondRunResponse = await createRun(request(`${origin}/api/workflow-definitions/${definition.id}/runs`, "POST"), context);
    expect(firstRunResponse.status).toBe(201);
    expect(secondRunResponse.status, JSON.stringify(await secondRunResponse.clone().json())).toBe(201);
    const firstRun = (await firstRunResponse.json()).run;
    const secondRun = (await secondRunResponse.json()).run;
    expect(firstRun.id).not.toBe(secondRun.id);
    expect(firstRun.definitionRevision).toBe(1);
    const listed = await listRuns(request(`${origin}/api/workflow-runs?definitionId=${definition.id}`, "GET"));
    expect(listed.status).toBe(200);
    expect((await listed.json()).runs).toHaveLength(2);
  });

  it("executa CRUD HTTP do formulario e atualiza valores do snapshot", async () => {
    const stepId = crypto.randomUUID();
    const created = await createDefinition(request(`${origin}/api/workflow-definitions`, "POST", {
      name: "Formulario HTTP",
      steps: [{ id: stepId, name: "Executar", order: 1, assignee: { type: "role", role: "owner" }, transitions: [{ id: crypto.randomUUID(), name: "Fim", result: "done", endsWorkflow: true }] }],
    }));
    const definition = (await created.json()).definition;
    const context = { params: Promise.resolve({ id: definition.id }) };
    const text = await addFormField(request(`${origin}/api/workflow-definitions/${definition.id}/form/fields`, "POST", {
      key: "customer", label: "Cliente", type: "text", required: true, order: 1, options: [],
    }), context);
    expect(text.status).toBe(201);
    const textField = (await text.json()).fields[0];
    const select = await addFormField(request(`${origin}/api/workflow-definitions/${definition.id}/form/fields`, "POST", {
      key: "priority", label: "Prioridade", type: "select", required: false, order: 2,
      defaultValue: "normal", options: [{ value: "normal", label: "Normal", order: 1 }, { value: "high", label: "Alta", order: 2 }],
    }), context);
    const selectField = (await select.json()).fields[1];
    expect((await getDefinitionForm(request(`${origin}/api/workflow-definitions/${definition.id}/form`, "GET"), context)).status).toBe(200);
    expect((await updateFormField(request(`${origin}/api/workflow-definitions/${definition.id}/form/fields/${textField.id}`, "PATCH", {
      key: "customer", label: "Cliente atualizado", type: "textarea", required: true, order: 1, options: [],
    }), { params: Promise.resolve({ id: definition.id, fieldId: textField.id }) })).status).toBe(200);
    expect((await reorderForm(request(`${origin}/api/workflow-definitions/${definition.id}/form/reorder`, "PATCH", {
      fieldIds: [selectField.id, textField.id],
    }), context)).status).toBe(200);
    expect((await removeFormField(request(`${origin}/api/workflow-definitions/${definition.id}/form/fields/${selectField.id}`, "DELETE"), {
      params: Promise.resolve({ id: definition.id, fieldId: selectField.id }),
    })).status).toBe(204);
    expect((await publishDefinition(request(`${origin}/api/workflow-definitions/${definition.id}/publish`, "POST"), context)).status).toBe(200);
    const runResponse = await createRun(request(`${origin}/api/workflow-definitions/${definition.id}/runs`, "POST"), context);
    const run = (await runResponse.json()).run;
    const runContext = { params: Promise.resolve({ id: run.id }) };
    const snapshot = await getRunForm(request(`${origin}/api/workflow-runs/${run.id}/form`, "GET"), runContext);
    expect(snapshot.status).toBe(200);
    expect((await snapshot.json()).form.fields[0]).toMatchObject({ key: "customer", label: "Cliente atualizado" });
    const invalid = await updateRunValues(request(`${origin}/api/workflow-runs/${run.id}/form/values`, "PATCH", {
      version: run.version, values: { customer: null },
    }), runContext);
    expect(invalid.status).toBe(400);
    const updated = await updateRunValues(request(`${origin}/api/workflow-runs/${run.id}/form/values`, "PATCH", {
      version: run.version, values: { customer: "ACME" },
    }), runContext);
    expect(updated.status).toBe(200);
    expect((await updated.json()).form.values.customer).toBe("ACME");
  });

  it("isola as novas rotas de formulário entre organizações", async () => {
    const definition = await prisma.workflowDefinition.findFirstOrThrow({ where: { organizationId: userId } });
    const response = await getDefinitionForm(new Request(`${origin}/api/workflow-definitions/${definition.id}/form`, {
      method: "GET",
      headers: { "x-organization-id": otherOrganizationId },
    }), { params: Promise.resolve({ id: definition.id }) });
    expect(response.status).toBe(404);
  });
});

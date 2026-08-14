import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

let cookieToken: string | undefined;
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => name.includes("session") && cookieToken ? { value: cookieToken } : undefined, set: vi.fn() }) }));

import { POST as completeTaskRoute } from "@/app/api/tasks/[id]/complete/route";
import { POST as startTaskRoute } from "@/app/api/tasks/[id]/start/route";
import { POST as legacyStartRoute } from "@/app/api/workflows/[id]/steps/[stepId]/start/route";
import { POST as legacyCompleteRoute } from "@/app/api/workflows/[id]/steps/[stepId]/complete/route";
import { GET as listTransitions, POST as addTransition } from "@/app/api/workflows/[id]/steps/[stepId]/transitions/route";
import { PATCH as updateTransition, DELETE as removeTransition } from "@/app/api/workflows/[id]/steps/[stepId]/transitions/[transitionId]/route";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { PrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);
const origin = "http://localhost";
const request = (url: string, body: unknown = {}) => new Request(url, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
const taskContext = (id: string) => ({ params: Promise.resolve({ id }) });
const legacyContext = (id: string, stepId: string) => ({ params: Promise.resolve({ id, stepId }) });

integration("task execution HTTP policy", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const organizationId = `task-http-org-${suffix}`;
  const ownerId = `task-http-owner-${suffix}`;
  const editorId = `task-http-editor-${suffix}`;
  const responsibleId = `task-http-responsible-${suffix}`;
  const tokens = { owner: `owner-token-${suffix}`, editor: `editor-token-${suffix}`, responsible: `responsible-token-${suffix}` };
  const workflows = ["legacy", "new"].map((kind) => ({ workflowId: `task-http-${kind}-${suffix}`, stepId: `task-http-${kind}-step-${suffix}` }));

  beforeAll(async () => {
    await prisma.user.createMany({ data: [ownerId, editorId, responsibleId].map((id) => ({ id, email: `${id}@test.invalid`, normalizedEmail: `${id}@test.invalid`, name: id })) });
    await prisma.userCredential.createMany({ data: [ownerId, editorId, responsibleId].map((userId) => ({ userId, passwordHash: "hash" })) });
    await prisma.authSession.createMany({ data: [
      { id: `owner-session-${suffix}`, userId: ownerId, tokenHash: createHash("sha256").update(tokens.owner).digest("hex"), expiresAt: new Date(Date.now() + 60_000) },
      { id: `editor-session-${suffix}`, userId: editorId, tokenHash: createHash("sha256").update(tokens.editor).digest("hex"), expiresAt: new Date(Date.now() + 60_000) },
      { id: `responsible-session-${suffix}`, userId: responsibleId, tokenHash: createHash("sha256").update(tokens.responsible).digest("hex"), expiresAt: new Date(Date.now() + 60_000) },
    ] });
    await prisma.organization.create({ data: { id: organizationId, name: "Task HTTP" } });
    await prisma.organizationMembership.createMany({ data: [
      { organizationId, userId: ownerId, role: "OWNER" },
      { organizationId, userId: editorId, role: "EDITOR" },
      { organizationId, userId: responsibleId, role: "VIEWER" },
    ] });
    for (const ids of workflows) {
      const engine = createWorkflowEngine({ clock: { now: () => new Date().toISOString() }, idGenerator: { createWorkflowId: () => ids.workflowId, createStepId: () => ids.stepId, createEventId: () => crypto.randomUUID() } });
      const created = engine.createWorkflow({ id: ids.workflowId, name: "Task", steps: [{ id: ids.stepId, name: "Execute", order: 1, assignee: { type: "user", userId: responsibleId } }] });
      if (!created.success) throw new Error(created.error.message);
      const prepared = engine.prepareWorkflow({ workflow: created.data });
      if (!prepared.success) throw new Error(prepared.error.message);
      const running = engine.startExecution({ workflow: prepared.data });
      if (!running.success) throw new Error(running.error.message);
      await new PrismaWorkflowPersistenceRepository(organizationId, prisma, ownerId).save(running.data);
    }
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { id: { in: workflows.map((item) => item.workflowId) } } });
    await prisma.workflowDefinition.deleteMany({ where: { id: { in: workflows.map((item) => item.workflowId) } } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, editorId, responsibleId] } } });
    await prisma.$disconnect();
  });

  it("nega start e complete antigos e complete novo ao editor não responsável", async () => {
    cookieToken = tokens.editor;
    const first = workflows[0];
    expect((await legacyStartRoute(request(`${origin}/api/workflows/${first.workflowId}/steps/${first.stepId}/start`), legacyContext(first.workflowId, first.stepId))).status).toBe(404);
    expect((await legacyCompleteRoute(request(`${origin}/api/workflows/${first.workflowId}/steps/${first.stepId}/complete`, { message: "x" }), legacyContext(first.workflowId, first.stepId))).status).toBe(404);
    expect((await completeTaskRoute(request(`${origin}/api/tasks/${first.stepId}/complete`, { message: "x" }), taskContext(first.stepId))).status).toBe(404);
  });

  it("permite ao responsável pelos caminhos antigo e novo", async () => {
    cookieToken = tokens.responsible;
    const legacy = workflows[0];
    expect((await legacyStartRoute(request(`${origin}/api/workflows/${legacy.workflowId}/steps/${legacy.stepId}/start`), legacyContext(legacy.workflowId, legacy.stepId))).status).toBe(200);
    expect((await legacyCompleteRoute(request(`${origin}/api/workflows/${legacy.workflowId}/steps/${legacy.stepId}/complete`, { message: "ok" }), legacyContext(legacy.workflowId, legacy.stepId))).status).toBe(200);
    const current = workflows[1];
    expect((await startTaskRoute(request(`${origin}/api/tasks/${current.stepId}/start`), taskContext(current.stepId))).status).toBe(200);
    expect((await completeTaskRoute(request(`${origin}/api/tasks/${current.stepId}/complete`, { message: "ok" }), taskContext(current.stepId))).status).toBe(200);
  });

  it("cria, lista, edita e remove transições no workflow em rascunho", async () => {
    cookieToken = tokens.owner;
    const draftId = `transition-http-${suffix}`;
    const firstId = `transition-http-first-${suffix}`;
    const secondId = `transition-http-second-${suffix}`;
    const localEngine = createWorkflowEngine({ clock: { now: () => new Date().toISOString() }, idGenerator: { createWorkflowId: () => draftId, createStepId: () => crypto.randomUUID(), createEventId: () => crypto.randomUUID(), createTransitionId: () => crypto.randomUUID() } });
    const created = localEngine.createWorkflow({ id: draftId, name: "Transitions", steps: [{ id: firstId, name: "First", order: 1, assignee: { type: "user", userId: ownerId } }, { id: secondId, name: "Second", order: 2, assignee: { type: "user", userId: ownerId } }] });
    if (!created.success) throw new Error(created.error.message);
    await new PrismaWorkflowPersistenceRepository(organizationId, prisma, ownerId).save(created.data);
    const ctx = { params: Promise.resolve({ id: draftId, stepId: firstId }) };
    const transitionRequest = (url: string, method = "GET", body?: unknown) => new Request(url, { method, headers: { origin, "content-type": "application/json", "x-organization-id": organizationId }, body: body ? JSON.stringify(body) : undefined });
    const added = await addTransition(transitionRequest(`${origin}/api/workflows/${draftId}/steps/${firstId}/transitions`, "POST", { name: "Encerrar", result: "stop", endsWorkflow: true }), ctx);
    expect(added.status).toBe(201);
    const addedWorkflow = (await added.json()).workflow;
    const transitionId = addedWorkflow.steps.find((item: { id: string }) => item.id === firstId).transitions.find((item: { result: string }) => item.result === "stop").id;
    expect((await listTransitions(transitionRequest(`${origin}/api/workflows/${draftId}/steps/${firstId}/transitions`), ctx)).status).toBe(200);
    const itemCtx = { params: Promise.resolve({ id: draftId, stepId: firstId, transitionId }) };
    expect((await updateTransition(transitionRequest(`${origin}/api/workflows/${draftId}/steps/${firstId}/transitions/${transitionId}`, "PATCH", { name: "Parar", result: "stop", endsWorkflow: true }), itemCtx)).status).toBe(200);
    expect((await removeTransition(transitionRequest(`${origin}/api/workflows/${draftId}/steps/${firstId}/transitions/${transitionId}`, "DELETE"), itemCtx)).status).toBe(204);
    await prisma.workflowRun.deleteMany({ where: { id: draftId } });
    await prisma.workflowDefinition.deleteMany({ where: { id: draftId } });
  });
});

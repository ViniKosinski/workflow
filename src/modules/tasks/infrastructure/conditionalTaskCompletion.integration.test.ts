import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let cookieToken: string | undefined;
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => name.includes("session") && cookieToken ? { value: cookieToken } : undefined, set: vi.fn() }) }));

import { POST as completeTaskRoute } from "@/app/api/tasks/[id]/complete/route";
import { completeTask } from "@/modules/tasks/application/completeTask";
import type { TaskTransactionManager } from "@/modules/tasks/domain/taskTransaction";
import { PrismaTaskRepository } from "@/modules/tasks/infrastructure/prismaTaskRepository";
import { PrismaTaskTransactionManager } from "@/modules/tasks/infrastructure/prismaTaskTransactionManager";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { WorkflowConcurrencyError } from "@/modules/workflows/domain/workflowPersistenceRepository";
import { PrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";
import { PrismaWorkflowRunRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowRunRepository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);
const origin = "http://localhost";

integration("conditional task completion", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const organizationId = `conditional-org-${suffix}`;
  const ownerId = `conditional-owner-${suffix}`;
  const actorA = `conditional-a-${suffix}`;
  const actorB = `conditional-b-${suffix}`;
  const tokenA = `conditional-token-${suffix}`;
  const workflowIds: string[] = [];

  const engine = () => createWorkflowEngine({
    clock: { now: () => new Date().toISOString() },
    idGenerator: { createWorkflowId: () => crypto.randomUUID(), createStepId: () => crypto.randomUUID(), createEventId: () => crypto.randomUUID(), createTransitionId: () => crypto.randomUUID() },
  });

  async function createRunningWorkflow(prefix: string) {
    const workflowId = `${prefix}-workflow-${suffix}`;
    const analysisId = `${prefix}-analysis-${suffix}`;
    const approvedId = `${prefix}-approved-${suffix}`;
    const finalId = `${prefix}-final-${suffix}`;
    workflowIds.push(workflowId);
    const workflowEngine = engine();
    const created = workflowEngine.createWorkflow({ id: workflowId, name: prefix, steps: [
      { id: analysisId, name: "Análise", order: 1, assignee: { type: "role", role: "editor" }, transitions: [
        { id: `${prefix}-yes-${suffix}`, name: "Aprovar", result: "approved", targetStepId: approvedId, endsWorkflow: false },
        { id: `${prefix}-no-${suffix}`, name: "Reprovar", result: "rejected", endsWorkflow: true },
      ] },
      { id: approvedId, name: "Contrato", order: 2, assignee: { type: "role", role: "editor" }, transitions: [
        { id: `${prefix}-continue-${suffix}`, name: "Continuar", result: "continue", targetStepId: finalId, endsWorkflow: false },
      ] },
      { id: finalId, name: "Finalização", order: 3, assignee: { type: "role", role: "editor" }, transitions: [
        { id: `${prefix}-done-${suffix}`, name: "Finalizar", result: "done", endsWorkflow: true },
      ] },
    ] });
    if (!created.success) throw new Error(created.error.message);
    const prepared = workflowEngine.prepareWorkflow({ workflow: created.data });
    if (!prepared.success) throw new Error(prepared.error.message);
    const running = workflowEngine.startExecution({ workflow: prepared.data });
    if (!running.success) throw new Error(running.error.message);
    await new PrismaWorkflowPersistenceRepository(organizationId, prisma, ownerId).save(running.data);
    return { workflowId, analysisId, approvedId, finalId };
  }

  async function createContinuingBranchWorkflow(
    prefix: string,
    selected: { result: string; name: string },
    discarded: { result: string; name: string },
  ) {
    const workflowId = `${prefix}-workflow-${suffix}`;
    const decisionId = `${prefix}-decision-${suffix}`;
    const selectedId = `${prefix}-selected-${suffix}`;
    const discardedId = `${prefix}-discarded-${suffix}`;
    const finalId = `${prefix}-final-${suffix}`;
    const selectedTransitionId = crypto.randomUUID();
    workflowIds.push(workflowId);
    const workflowEngine = engine();
    const created = workflowEngine.createWorkflow({ id: workflowId, name: prefix, steps: [
      { id: decisionId, name: "Decisão", order: 1, assignee: { type: "role", role: "editor" }, transitions: [
        { id: selectedTransitionId, name: selected.name, result: selected.result, targetStepId: selectedId, endsWorkflow: false },
        { id: crypto.randomUUID(), name: discarded.name, result: discarded.result, targetStepId: discardedId, endsWorkflow: false },
      ] },
      { id: selectedId, name: selected.name, order: 2, assignee: { type: "role", role: "editor" }, transitions: [
        { id: crypto.randomUUID(), name: "Continuar", result: "continue-selected", targetStepId: finalId, endsWorkflow: false },
      ] },
      { id: discardedId, name: discarded.name, order: 3, assignee: { type: "role", role: "editor" }, transitions: [
        { id: crypto.randomUUID(), name: "Continuar", result: "continue-discarded", targetStepId: finalId, endsWorkflow: false },
      ] },
      { id: finalId, name: "Finalização", order: 4, assignee: { type: "role", role: "editor" }, transitions: [
        { id: crypto.randomUUID(), name: "Finalizar", result: "done", endsWorkflow: true },
      ] },
    ] });
    if (!created.success) throw new Error(created.error.message);
    const prepared = workflowEngine.prepareWorkflow({ workflow: created.data });
    if (!prepared.success) throw new Error(prepared.error.message);
    const running = workflowEngine.startExecution({ workflow: prepared.data });
    if (!running.success) throw new Error(running.error.message);
    await new PrismaWorkflowPersistenceRepository(organizationId, prisma, ownerId).save(running.data);
    return { workflowId, decisionId, selectedId, discardedId, finalId, selectedTransitionId };
  }

  const request = (taskId: string, result: string) => new Request(`${origin}/api/tasks/${taskId}/complete`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ result, observation: "Decisão integrada" }),
  });

  beforeAll(async () => {
    await prisma.user.createMany({ data: [ownerId, actorA, actorB].map((id) => ({ id, email: `${id}@test.invalid`, normalizedEmail: `${id}@test.invalid`, name: id })) });
    await prisma.userCredential.create({ data: { userId: actorA, passwordHash: "hash" } });
    await prisma.authSession.create({ data: { id: `conditional-session-${suffix}`, userId: actorA, tokenHash: createHash("sha256").update(tokenA).digest("hex"), expiresAt: new Date(Date.now() + 60_000) } });
    await prisma.organization.create({ data: { id: organizationId, name: "Conditional" } });
    await prisma.organizationMembership.createMany({ data: [
      { organizationId, userId: ownerId, role: "OWNER" },
      { organizationId, userId: actorA, role: "EDITOR" },
      { organizationId, userId: actorB, role: "EDITOR" },
    ] });
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { id: { in: workflowIds } } });
    await prisma.workflowDefinition.deleteMany({ where: { id: { in: workflowIds } } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, actorA, actorB] } } });
    await prisma.$disconnect();
  });

  it("conclui uma ramificação pela API e ativa somente a etapa escolhida", async () => {
    const ids = await createRunningWorkflow("approved");
    cookieToken = tokenA;
    const response = await completeTaskRoute(request(ids.analysisId, "approved"), { params: Promise.resolve({ id: ids.analysisId }) });
    expect(response.status).toBe(200);
    const run = await prisma.workflowRun.findUniqueOrThrow({ where: { id: ids.workflowId }, include: { steps: true, events: true, workflowDefinition: true } });
    expect(run.currentStepId).toBe(ids.approvedId);
    expect(run.steps.find((step) => step.id === ids.analysisId)).toMatchObject({ status: "COMPLETED", executionResult: { selectedResult: "approved", observation: "Decisão integrada" } });
    expect(run.steps.find((step) => step.id === ids.approvedId)?.status).toBe("PENDING");
    expect(run.events.filter((event) => event.eventType === "step.completed")).toHaveLength(1);
    expect(run.version).toBe(2);
    expect(run.workflowDefinition.version).toBe(1);
  });

  it("marca imediatamente o ramo reprovado como SKIPPED ao escolher APROVADO", async () => {
    const ids = await createContinuingBranchWorkflow(
      "approved-branch",
      { result: "approved", name: "B" },
      { result: "rejected", name: "C" },
    );
    cookieToken = tokenA;
    const response = await completeTaskRoute(request(ids.decisionId, "approved"), { params: Promise.resolve({ id: ids.decisionId }) });
    expect(response.status).toBe(200);
    const run = await prisma.workflowRun.findUniqueOrThrow({ where: { id: ids.workflowId }, include: { steps: true, events: true } });
    expect(run.status).toBe("RUNNING");
    expect(run.currentStepId).toBe(ids.selectedId);
    expect(run.steps.find((step) => step.id === ids.selectedId)?.status).toBe("PENDING");
    expect(run.steps.find((step) => step.id === ids.discardedId)?.status).toBe("SKIPPED");
    expect(run.steps.find((step) => step.id === ids.finalId)?.status).toBe("PENDING");
    const skippedEvent = run.events.find((event) => event.eventType === "step.skipped");
    expect(skippedEvent).toMatchObject({ workflowRunStepId: ids.discardedId });
    expect(skippedEvent?.metadata).toMatchObject({
      selectedResult: "approved",
      sourceStepId: ids.decisionId,
      transition: ids.selectedTransitionId,
      executorUserId: actorA,
      reason: "A decisão approved selecionou outro caminho.",
    });
  });

  it("mantém Financeiro no caminho e ignora Comercial imediatamente", async () => {
    const ids = await createContinuingBranchWorkflow(
      "department-branch",
      { result: "financial", name: "Financeiro" },
      { result: "commercial", name: "Comercial" },
    );
    cookieToken = tokenA;
    const response = await completeTaskRoute(request(ids.decisionId, "financial"), { params: Promise.resolve({ id: ids.decisionId }) });
    expect(response.status).toBe(200);
    const run = await prisma.workflowRun.findUniqueOrThrow({ where: { id: ids.workflowId }, include: { steps: true, events: true } });
    expect(run.currentStepId).toBe(ids.selectedId);
    expect(run.steps.find((step) => step.id === ids.selectedId)?.status).toBe("PENDING");
    expect(run.steps.find((step) => step.id === ids.discardedId)?.status).toBe("SKIPPED");
    expect(run.events.filter((event) => event.eventType === "step.skipped")).toHaveLength(1);
  });

  it("encerra antecipadamente e persiste etapas e histórico como SKIPPED", async () => {
    const ids = await createRunningWorkflow("early");
    cookieToken = tokenA;
    const response = await completeTaskRoute(request(ids.analysisId, "rejected"), { params: Promise.resolve({ id: ids.analysisId }) });
    expect(response.status).toBe(200);
    const run = await prisma.workflowRun.findUniqueOrThrow({ where: { id: ids.workflowId }, include: { steps: true, events: { orderBy: { occurredAt: "asc" } }, workflowDefinition: true } });
    expect(run.status).toBe("COMPLETED");
    expect(run.currentStepId).toBeNull();
    expect(run.steps.find((step) => step.id === ids.analysisId)?.status).toBe("COMPLETED");
    expect(run.steps.filter((step) => [ids.approvedId, ids.finalId].includes(step.id)).map((step) => step.status)).toEqual(["SKIPPED", "SKIPPED"]);
    const skippedEvents = run.events.filter((event) => event.eventType === "step.skipped");
    expect(skippedEvents).toHaveLength(2);
    expect(skippedEvents[0].metadata).toMatchObject({ selectedResult: "rejected", sourceStepId: ids.analysisId, executorUserId: actorA });
    expect(run.version).toBe(2);
    expect(run.workflowDefinition.version).toBe(1);
  });

  it("aceita uma só decisão concorrente e retorna conflito conhecido para a perdedora", async () => {
    const ids = await createRunningWorkflow("race");
    let readers = 0;
    let releaseReaders!: () => void;
    const readersReady = new Promise<void>((resolve) => { releaseReaders = resolve; });
    const synchronizedTransactions = (): TaskTransactionManager => ({
      run: async (work) => {
        try {
          return await prisma.$transaction(async (transaction) => {
            const repository = new PrismaTaskRepository(transaction);
            return work({
              tasks: {
                listMine: repository.listMine.bind(repository),
                findForHistory: repository.findForHistory.bind(repository),
                listHistory: repository.listHistory.bind(repository),
                findMine: async (taskId, userId) => {
                  const access = await repository.findMine(taskId, userId);
                  readers += 1;
                  if (readers === 2) releaseReaders();
                  await readersReady;
                  return access;
                },
              },
              workflow: (currentOrganizationId) => ({ engine: engine(), repository: new PrismaWorkflowRunRepository(currentOrganizationId, transaction) }),
            });
          }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") throw new WorkflowConcurrencyError(ids.workflowId);
          throw error;
        }
      },
    });
    const results = await Promise.allSettled([
      completeTask({ ...createTaskDependencies(actorA), transactions: synchronizedTransactions() }, { taskId: ids.analysisId, selectedResult: "approved" }, actorA),
      completeTask({ ...createTaskDependencies(actorB), transactions: synchronizedTransactions() }, { taskId: ids.analysisId, selectedResult: "rejected" }, actorB),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(WorkflowConcurrencyError);
    const run = await prisma.workflowRun.findUniqueOrThrow({ where: { id: ids.workflowId }, include: { steps: true, events: true, workflowDefinition: true } });
    expect(run.events.filter((event) => event.eventType === "step.completed")).toHaveLength(1);
    expect(run.version).toBe(2);
    expect(run.workflowDefinition.version).toBe(1);
    const completion = run.events.find((event) => event.eventType === "step.completed")!;
    const metadata = completion.metadata as { selectedResult: string };
    expect(["approved", "rejected"]).toContain(metadata.selectedResult);
    expect(run.currentStepId === ids.approvedId || run.status === "COMPLETED").toBe(true);
  });

  it("faz rollback de estado, histórico e versão quando falha depois da persistência", async () => {
    const ids = await createRunningWorkflow("rollback");
    const transactions: TaskTransactionManager = {
      run: async (work) => prisma.$transaction(async (transaction) => {
        await work({
          tasks: new PrismaTaskRepository(transaction),
          workflow: (currentOrganizationId) => ({ engine: engine(), repository: new PrismaWorkflowRunRepository(currentOrganizationId, transaction) }),
        });
        throw new Error("forced rollback");
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }),
    };
    await expect(completeTask({ ...createTaskDependencies(actorA), transactions }, { taskId: ids.analysisId, selectedResult: "rejected" }, actorA)).rejects.toThrow("forced rollback");
    const run = await prisma.workflowRun.findUniqueOrThrow({ where: { id: ids.workflowId }, include: { steps: true, events: true, workflowDefinition: true } });
    expect(run.status).toBe("RUNNING");
    expect(run.currentStepId).toBe(ids.analysisId);
    expect(run.steps.find((step) => step.id === ids.analysisId)?.status).toBe("PENDING");
    expect(run.steps.some((step) => step.status === "SKIPPED")).toBe(false);
    expect(run.events.some((event) => ["step.completed", "step.skipped", "workflow.completed"].includes(event.eventType))).toBe(false);
    expect(run.version).toBe(1);
    expect(run.workflowDefinition.version).toBe(1);
  });

  it("traduz P2034 do gerenciador transacional para WorkflowConcurrencyError", async () => {
    const conflictingPrisma = { $transaction: vi.fn().mockRejectedValue(new Prisma.PrismaClientKnownRequestError("serialization", { code: "P2034", clientVersion: "7.9.0" })) } as unknown as PrismaClient;
    const manager = new PrismaTaskTransactionManager(actorA, conflictingPrisma);
    await expect(manager.run(async () => undefined)).rejects.toBeInstanceOf(WorkflowConcurrencyError);
  });
});

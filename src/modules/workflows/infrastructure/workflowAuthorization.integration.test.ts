import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { addWorkflowStep } from "@/modules/workflows/application/addWorkflowStep";
import { cancelPersistedWorkflow } from "@/modules/workflows/application/cancelPersistedWorkflow";
import { completePersistedWorkflowStep } from "@/modules/workflows/application/completePersistedWorkflowStep";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import { preparePersistedWorkflow } from "@/modules/workflows/application/preparePersistedWorkflow";
import { registerPersistedWorkflowFailure } from "@/modules/workflows/application/registerPersistedWorkflowFailure";
import { removeWorkflowStep } from "@/modules/workflows/application/removeWorkflowStep";
import { renameWorkflowStep } from "@/modules/workflows/application/renameWorkflowStep";
import { reorderWorkflowSteps } from "@/modules/workflows/application/reorderWorkflowSteps";
import { startPersistedWorkflow } from "@/modules/workflows/application/startPersistedWorkflow";
import { startPersistedWorkflowStep } from "@/modules/workflows/application/startPersistedWorkflowStep";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import type { WorkflowPersistenceRepository } from "@/modules/workflows/domain/workflowPersistenceRepository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("workflow authorization with PostgreSQL", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const ownerA = `test-user-a-${crypto.randomUUID()}`;
  const ownerB = `test-user-b-${crypto.randomUUID()}`;
  const workflowId = `test-workflow-${crypto.randomUUID()}`;
  const stepId = `test-step-${crypto.randomUUID()}`;
  const engine = createWorkflowEngine({
    clock: { now: () => new Date().toISOString() },
    idGenerator: {
      createWorkflowId: () => workflowId,
      createStepId: () => stepId,
      createEventId: () => `event-${crypto.randomUUID()}`,
    },
  });
  let repositoryA: WorkflowPersistenceRepository;
  let repositoryB: WorkflowPersistenceRepository;
  const dependenciesB = { workflowEngine: engine, get workflowRepository() { return repositoryB; } };

  beforeAll(async () => {
    const { PrismaWorkflowPersistenceRepository } = await import("@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository");
    repositoryA = new PrismaWorkflowPersistenceRepository(ownerA, prisma);
    repositoryB = new PrismaWorkflowPersistenceRepository(ownerB, prisma);
    await prisma.user.createMany({ data: [
      { id: ownerA, email: `${ownerA}@test.invalid`, normalizedEmail: `${ownerA}@test.invalid`, name: "A", status: "ACTIVE" },
      { id: ownerB, email: `${ownerB}@test.invalid`, normalizedEmail: `${ownerB}@test.invalid`, name: "B", status: "ACTIVE" },
    ] });
    const created = engine.createWorkflow({ name: "Privado A", steps: [{ name: "Etapa", order: 1 }] });
    if (!created.success) throw new Error(created.error.message);
    await repositoryA.save(created.data);
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { id: workflowId } });
    await prisma.workflowDefinition.deleteMany({ where: { id: workflowId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerA, ownerB] } } });
    await prisma.$disconnect();
  });

  it("impede leitura, listagem, existência e update cruzados", async () => {
    await expect(repositoryB.findById(workflowId)).resolves.toBeNull();
    await expect(repositoryB.list()).resolves.toEqual([]);
    await expect(repositoryB.exists(workflowId)).resolves.toBe(false);
    const owned = await repositoryA.findById(workflowId);
    await expect(repositoryB.update(owned!)).rejects.toThrow("not found");
  });

  it("impede todos os casos de uso mutáveis do usuário B", async () => {
    const actions = [
      () => preparePersistedWorkflow(dependenciesB, workflowId),
      () => startPersistedWorkflow(dependenciesB, workflowId),
      () => cancelPersistedWorkflow(dependenciesB, { workflowId, reason: "Sem acesso" }),
      () => addWorkflowStep(dependenciesB, { workflowId, name: "Outra" }),
      () => renameWorkflowStep(dependenciesB, { workflowId, stepId, name: "Outra" }),
      () => removeWorkflowStep(dependenciesB, { workflowId, stepId }),
      () => reorderWorkflowSteps(dependenciesB, { workflowId, orderedStepIds: [stepId] }),
      () => startPersistedWorkflowStep(dependenciesB, { workflowId, stepId }),
      () => completePersistedWorkflowStep(dependenciesB, { workflowId, stepId, result: { message: "feito" } }),
      () => registerPersistedWorkflowFailure(dependenciesB, { workflowId, stepId, failure: { reason: "falha" } }),
    ];
    for (const action of actions) await expect(action()).rejects.toMatchObject({ name: "WorkflowNotFoundError" });
    await expect(getPersistedWorkflowById(dependenciesB, workflowId)).rejects.toMatchObject({ name: "WorkflowNotFoundError" });
  });
});

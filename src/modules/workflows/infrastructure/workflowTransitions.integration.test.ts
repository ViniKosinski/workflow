import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { PrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);
integration("workflow transitions persistence", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID(); const userId = `transition-user-${suffix}`; const workflowId = `transition-flow-${suffix}`;
  const engine = createWorkflowEngine({ clock: { now: () => new Date().toISOString() }, idGenerator: { createWorkflowId: () => workflowId, createStepId: () => crypto.randomUUID(), createEventId: () => crypto.randomUUID(), createTransitionId: () => crypto.randomUUID() } });
  const repository = new PrismaWorkflowPersistenceRepository(userId, prisma, userId);
  beforeAll(async () => { await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid`, normalizedEmail: `${userId}@test.invalid`, name: "User" } }); await prisma.organization.create({ data: { id: userId, name: "Org" } }); await prisma.organizationMembership.create({ data: { organizationId: userId, userId, role: "OWNER" } }); });
  afterAll(async () => { await prisma.workflowRun.deleteMany({ where: { id: workflowId } }); await prisma.workflowDefinition.deleteMany({ where: { id: workflowId } }); await prisma.organization.deleteMany({ where: { id: userId } }); await prisma.user.deleteMany({ where: { id: userId } }); await prisma.$disconnect(); });
  it("persiste ramificação, executa resultado e preserva histórico", async () => {
    const created = engine.createWorkflow({ id: workflowId, name: "Sales", steps: [
      { id: "sales", name: "Comercial", order: 1, assignee: { type: "user", userId }, transitions: [{ name: "Fechou", result: "won", targetStepId: "finance", endsWorkflow: false }, { name: "Não fechou", result: "lost", endsWorkflow: true }] },
      { id: "finance", name: "Financeiro", order: 2, assignee: { type: "user", userId }, transitions: [{ name: "Finalizar", result: "done", endsWorkflow: true }] },
    ] });
    if (!created.success) throw new Error(created.error.message);
    let persisted = await repository.save(created.data);
    expect(persisted.steps[0].transitions).toHaveLength(2);
    const prepared = engine.prepareWorkflow({ workflow: persisted }); if (!prepared.success) throw new Error(prepared.error.message);
    const running = engine.startExecution({ workflow: prepared.data }); if (!running.success) throw new Error(running.error.message);
    const started = engine.startStep({ workflow: running.data, stepId: "sales" }); if (!started.success) throw new Error(started.error.message);
    const completed = engine.completeStep({ workflow: started.data, stepId: "sales", executorUserId: userId, result: { selectedResult: "won", observation: "Contrato assinado" } }); if (!completed.success) throw new Error(completed.error.message);
    persisted = await repository.update(completed.data);
    expect(persisted.currentStepId).toBe("finance");
    expect(persisted.executionHistory.at(-1)?.metadata).toMatchObject({ selectedResult: "won", sourceStepId: "sales", targetStepId: "finance", observation: "Contrato assinado", workflowEnded: false });
  });
});

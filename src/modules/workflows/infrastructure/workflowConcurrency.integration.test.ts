import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { WorkflowConcurrencyError } from "@/modules/workflows/domain/workflowPersistenceRepository";
import { PrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("workflow optimistic concurrency", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const userId = `concurrency-user-${suffix}`;
  const workflowId = `concurrency-workflow-${suffix}`;
  const repository = new PrismaWorkflowPersistenceRepository(userId, prisma, userId);
  const engine = createWorkflowEngine({
    clock: { now: () => new Date().toISOString() },
    idGenerator: {
      createWorkflowId: () => workflowId,
      createStepId: () => `step-${crypto.randomUUID()}`,
      createEventId: () => `event-${crypto.randomUUID()}`,
    },
  });

  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid`, normalizedEmail: `${userId}@test.invalid`, name: "Concurrency" } });
    await prisma.organization.create({ data: { id: userId, name: "Concurrency" } });
    await prisma.organizationMembership.create({ data: { organizationId: userId, userId, role: "OWNER" } });
    const created = engine.createWorkflow({ name: "Versioned", steps: [{ name: "Initial", order: 1, assignee: { type: "user", userId } }] });
    if (!created.success) throw new Error(created.error.message);
    await repository.save(created.data);
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { id: workflowId } });
    await prisma.workflowDefinition.deleteMany({ where: { id: workflowId } });
    await prisma.organization.deleteMany({ where: { id: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("rejeita update concorrente baseado na mesma versão", async () => {
    const firstSnapshot = await repository.findById(workflowId);
    const secondSnapshot = await repository.findById(workflowId);
    expect(firstSnapshot?.version).toBe(1);
    const first = engine.addStep({ workflow: firstSnapshot!, name: "First" });
    const second = engine.addStep({ workflow: secondSnapshot!, name: "Second" });
    if (!first.success || !second.success) throw new Error("Unexpected engine failure");

    const results = await Promise.allSettled([repository.update(first.data), repository.update(second.data)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(rejected?.reason).toBeInstanceOf(WorkflowConcurrencyError);
    await expect(repository.findById(workflowId)).resolves.toMatchObject({ version: 2 });
  });
});

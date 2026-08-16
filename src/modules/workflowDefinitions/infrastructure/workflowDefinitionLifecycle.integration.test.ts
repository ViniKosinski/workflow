import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  publishWorkflowDefinition,
  startWorkflowDefinitionRun,
} from "@/modules/workflowDefinitions/application/workflowDefinitionUseCases";
import { WorkflowDefinitionService } from "@/modules/workflowDefinitions/domain/workflowDefinition";
import { PrismaWorkflowDefinitionRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowDefinitionRepository";
import { PrismaWorkflowRunRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowRunRepository";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { WorkflowAssignmentService } from "@/modules/workflows/domain/workflowEngine";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { WorkflowFormService } from "@/modules/workflowDefinitions/domain/workflowForm";
import { PrismaWorkflowRunFormRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowRunFormRepository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("versioned workflow definitions and independent runs", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const organizationId = `versioned-org-${suffix}`;
  const userId = `versioned-user-${suffix}`;
  const definitionId = `versioned-definition-${suffix}`;
  const service = new WorkflowDefinitionService();
  const definitions = new PrismaWorkflowDefinitionRepository(organizationId, prisma);
  const runs = new PrismaWorkflowRunRepository(organizationId, prisma);
  const engine = createWorkflowEngine({
    clock: { now: () => new Date().toISOString() },
    idGenerator: {
      createWorkflowId: () => crypto.randomUUID(),
      createStepId: () => crypto.randomUUID(),
      createEventId: () => crypto.randomUUID(),
      createTransitionId: () => crypto.randomUUID(),
    },
  });
  const dependencies = {
    definitions,
    runs,
    service,
    workflowEngine: engine,
    authorization: { require: async () => undefined },
    memberships: new PrismaMembershipRepository(prisma),
    assignments: new WorkflowAssignmentService(),
    organizationId,
    forms: new WorkflowFormService(),
    runForms: new PrismaWorkflowRunFormRepository(organizationId, prisma),
    clock: { now: () => new Date().toISOString() },
    ids: { create: () => crypto.randomUUID() },
  };

  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid`, normalizedEmail: `${userId}@test.invalid`, name: "Versioned" } });
    await prisma.organization.create({ data: { id: organizationId, name: "Versioned" } });
    await prisma.organizationMembership.create({ data: { organizationId, userId, role: "OWNER" } });
    await definitions.create(service.create({
      id: definitionId,
      name: "Processo reutilizável",
      createdByUserId: userId,
      now: new Date().toISOString(),
      steps: [
        {
          id: `versioned-analysis-${suffix}`,
          name: "Análise",
          order: 1,
          slaDurationHours: 48,
          assignee: { type: "user", userId },
          transitions: [{ id: crypto.randomUUID(), name: "Continuar", result: "continue", targetStepId: `versioned-finish-${suffix}`, endsWorkflow: false }],
        },
        {
          id: `versioned-finish-${suffix}`,
          name: "Finalização",
          order: 2,
          slaDurationHours: 24,
          assignee: { type: "user", userId },
          transitions: [{ id: crypto.randomUUID(), name: "Finalizar", result: "done", endsWorkflow: true }],
        },
      ],
    }));
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { workflowDefinition: { organizationId } } });
    await prisma.workflowDefinition.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("publica uma revisão imutável e cria duas execuções com identidades próprias", async () => {
    const published = await publishWorkflowDefinition(dependencies, definitionId, userId);
    const first = await startWorkflowDefinitionRun(dependencies, definitionId, userId);
    const second = await startWorkflowDefinitionRun(dependencies, definitionId, userId);

    expect(published.status).toBe("published");
    expect(first.id).not.toBe(second.id);
    expect(first.definitionId).toBe(definitionId);
    expect(first.definitionRevision).toBe(1);
    expect(first.steps[0].id).not.toBe(second.steps[0].id);
    expect(first.currentStepId).not.toBe(second.currentStepId);
    const initialDeadlines = await prisma.workflowRunStep.findMany({ where: { workflowRunId: first.id }, orderBy: { order: "asc" }, select: { slaDurationHours: true, dueAt: true } });
    expect(initialDeadlines).toMatchObject([{ slaDurationHours: 48, dueAt: expect.any(Date) }, { slaDurationHours: 24, dueAt: null }]);

    const firstStarted = engine.startStep({ workflow: first, stepId: first.currentStepId! });
    if (!firstStarted.success) throw new Error(firstStarted.error.message);
    const firstCompleted = engine.completeStep({
      workflow: firstStarted.data,
      stepId: first.currentStepId!,
      executorUserId: userId,
      result: { selectedResult: "continue" },
    });
    if (!firstCompleted.success) throw new Error(firstCompleted.error.message);
    const updatedFirst = await runs.update(firstCompleted.data);
    const untouchedSecond = await runs.findById(second.id);
    const unchangedDefinition = await definitions.findById(definitionId);

    expect(updatedFirst.currentStepId).not.toBe(first.currentStepId);
    const activatedDeadline = await prisma.workflowRunStep.findUnique({ where: { id: updatedFirst.currentStepId! }, select: { dueAt: true } });
    expect(activatedDeadline?.dueAt).toBeInstanceOf(Date);
    expect(untouchedSecond?.currentStepId).toBe(second.currentStepId);
    expect(untouchedSecond?.version).toBe(1);
    expect(unchangedDefinition?.lockVersion).toBe(2);
  });
});

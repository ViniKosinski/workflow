import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { PrismaOperationalDashboardRepository } from "@/modules/dashboard/infrastructure/prismaOperationalDashboardRepository";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { PrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("operational dashboard persistence", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const ownerId = `dashboard-owner-${suffix}`;
  const organizationId = `dashboard-org-${suffix}`;
  const workflowId = `dashboard-workflow-${suffix}`;
  const stepId = `dashboard-step-${suffix}`;

  beforeAll(async () => {
    await prisma.user.create({ data: { id: ownerId, email: `${ownerId}@test.invalid`, normalizedEmail: `${ownerId}@test.invalid`, name: "Gestor" } });
    await prisma.organization.create({ data: { id: organizationId, name: "Operação", memberships: { create: { userId: ownerId, role: "OWNER" } } } });
    const engine = createWorkflowEngine({ clock: { now: () => "2026-08-15T10:00:00.000Z" }, idGenerator: { createWorkflowId: () => workflowId, createStepId: () => stepId, createEventId: () => crypto.randomUUID() } });
    const created = engine.createWorkflow({ id: workflowId, name: "Compras", steps: [{ id: stepId, name: "Aprovar compra", order: 1, assignee: { type: "user", userId: ownerId } }] });
    if (!created.success) throw new Error(created.error.message);
    const prepared = engine.prepareWorkflow({ workflow: created.data });
    if (!prepared.success) throw new Error(prepared.error.message);
    const running = engine.startExecution({ workflow: prepared.data });
    if (!running.success) throw new Error(running.error.message);
    await new PrismaWorkflowPersistenceRepository(organizationId, prisma, ownerId).save(running.data);
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { id: workflowId } });
    await prisma.workflowDefinition.deleteMany({ where: { id: workflowId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: ownerId } });
    await prisma.$disconnect();
  });

  it("agrega a operação sem incluir outras organizações", async () => {
    const result = await new PrismaOperationalDashboardRepository().getOrganization(organizationId);
    expect(result).toMatchObject({ organizationId, pendingTasks: 1, runningTasks: 0, activeRuns: 1, completedRuns: 0 });
    expect(result.tasksByStatus).toContainEqual({ status: "pending", count: 1 });
    expect(result.runsByWorkflow).toEqual([expect.objectContaining({ workflowName: "Compras", total: 1, active: 1 })]);
    expect(result.oldestTasks).toEqual([expect.objectContaining({ id: stepId, name: "Aprovar compra", assigneeName: "Gestor" })]);
  });
});

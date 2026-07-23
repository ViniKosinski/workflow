import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { removeOrganizationMember } from "@/modules/organizations/application/removeOrganizationMember";
import { changeOrganizationMemberRole } from "@/modules/organizations/application/changeOrganizationMemberRole";
import { organizationDependencies } from "@/modules/organizations/organizationDependencies";
import { completeTask } from "@/modules/tasks/application/completeTask";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { PrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("task and membership concurrency", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const organizationId = `task-race-org-${suffix}`;
  const ownerId = `task-race-owner-${suffix}`;
  const directUserId = `task-race-direct-${suffix}`;
  const roleUserId = `task-race-role-${suffix}`;
  const direct = { workflowId: `task-race-direct-flow-${suffix}`, stepId: `task-race-direct-step-${suffix}` };
  const role = { workflowId: `task-race-role-flow-${suffix}`, stepId: `task-race-role-step-${suffix}` };

  async function createRunning(ids: typeof direct, assignee: { type: "user"; userId: string } | { type: "role"; role: "editor" }) {
    const engine = createWorkflowEngine({ clock: { now: () => new Date().toISOString() }, idGenerator: { createWorkflowId: () => ids.workflowId, createStepId: () => ids.stepId, createEventId: () => crypto.randomUUID() } });
    const created = engine.createWorkflow({ id: ids.workflowId, name: "Race", steps: [{ id: ids.stepId, name: "Execute", order: 1, assignee }] });
    if (!created.success) throw new Error(created.error.message);
    const prepared = engine.prepareWorkflow({ workflow: created.data });
    if (!prepared.success) throw new Error(prepared.error.message);
    const running = engine.startExecution({ workflow: prepared.data });
    if (!running.success) throw new Error(running.error.message);
    await new PrismaWorkflowPersistenceRepository(organizationId, prisma, ownerId).save(running.data);
  }

  beforeAll(async () => {
    await prisma.user.createMany({ data: [ownerId, directUserId, roleUserId].map((id) => ({ id, email: `${id}@test.invalid`, normalizedEmail: `${id}@test.invalid`, name: id })) });
    await prisma.organization.create({ data: { id: organizationId, name: "Race" } });
    await prisma.organizationMembership.createMany({ data: [
      { organizationId, userId: ownerId, role: "OWNER" },
      { organizationId, userId: directUserId, role: "VIEWER" },
      { organizationId, userId: roleUserId, role: "EDITOR" },
    ] });
    await createRunning(direct, { type: "user", userId: directUserId });
    await createRunning(role, { type: "role", role: "editor" });
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { id: { in: [direct.workflowId, role.workflowId] } } });
    await prisma.workflowDefinition.deleteMany({ where: { id: { in: [direct.workflowId, role.workflowId] } } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, directUserId, roleUserId] } } });
    await prisma.$disconnect();
  });

  it("não persiste remoção com tarefa direta ainda ativa", async () => {
    await Promise.allSettled([
      completeTask(createTaskDependencies(directUserId), { taskId: direct.stepId }, directUserId),
      removeOrganizationMember(organizationDependencies, ownerId, organizationId, directUserId),
    ]);
    const workflow = await prisma.workflowRun.findUnique({ where: { id: direct.workflowId }, select: { status: true } });
    const membership = await prisma.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId, userId: directUserId } } });
    expect(workflow?.status === "COMPLETED" || membership !== null).toBe(true);
    if (!membership) expect(workflow?.status).toBe("COMPLETED");
  });

  it("mantém estado serializável ao alterar papel durante conclusão", async () => {
    await Promise.allSettled([
      completeTask(createTaskDependencies(roleUserId), { taskId: role.stepId }, roleUserId),
      changeOrganizationMemberRole(organizationDependencies, ownerId, organizationId, roleUserId, { role: "viewer" }),
    ]);
    const workflow = await prisma.workflowRun.findUnique({ where: { id: role.workflowId }, select: { status: true } });
    const membership = await prisma.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId, userId: roleUserId } }, select: { role: true } });
    expect(["RUNNING", "COMPLETED"]).toContain(workflow?.status);
    if (workflow?.status === "RUNNING") expect(membership?.role).toBe("VIEWER");
  });
});

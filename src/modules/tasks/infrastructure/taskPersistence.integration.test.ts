import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { PrismaTaskRepository } from "@/modules/tasks/infrastructure/prismaTaskRepository";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { PrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("collaborative task persistence", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const ownerId = `task-owner-${suffix}`;
  const memberId = `task-member-${suffix}`;
  const outsiderId = `task-outsider-${suffix}`;
  const organizationId = `task-org-${suffix}`;
  const workflowId = `task-workflow-${suffix}`;
  const stepId = `task-step-${suffix}`;
  const tasks = new PrismaTaskRepository();

  beforeAll(async () => {
    await prisma.user.createMany({ data: [ownerId, memberId, outsiderId].map((id) => ({ id, email: `${id}@test.invalid`, normalizedEmail: `${id}@test.invalid`, name: id })) });
    await prisma.organization.create({ data: { id: organizationId, name: "Equipe" } });
    await prisma.organizationMembership.createMany({ data: [
      { organizationId, userId: ownerId, role: "OWNER" },
      { organizationId, userId: memberId, role: "EDITOR" },
    ] });
    const engine = createWorkflowEngine({ clock: { now: () => new Date().toISOString() }, idGenerator: { createWorkflowId: () => workflowId, createStepId: () => stepId, createEventId: () => crypto.randomUUID() } });
    const repository = new PrismaWorkflowPersistenceRepository(organizationId, prisma, ownerId);
    const created = engine.createWorkflow({ id: workflowId, name: "Aprovação", steps: [{ id: stepId, name: "Revisar", order: 1, assignee: { type: "user", userId: memberId } }] });
    if (!created.success) throw new Error(created.error.message);
    const prepared = engine.prepareWorkflow({ workflow: created.data });
    if (!prepared.success) throw new Error(prepared.error.message);
    const running = engine.startExecution({ workflow: prepared.data });
    if (!running.success) throw new Error(running.error.message);
    await repository.save(running.data);
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { id: workflowId } });
    await prisma.workflowDefinition.deleteMany({ where: { id: workflowId } });
    await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, memberId, outsiderId] } } });
    await prisma.$disconnect();
  });

  it("lista somente para o responsável membro da organização", async () => {
    const query = { order: "desc" as const, page: 1, pageSize: 10 };
    await expect(tasks.listMine(memberId, query)).resolves.toMatchObject({ tasks: [expect.objectContaining({ id: stepId, organizationId, workflowId })], total: 1 });
    await expect(tasks.listMine(ownerId, query)).resolves.toMatchObject({ tasks: [], total: 0 });
    await expect(tasks.listMine(outsiderId, query)).resolves.toMatchObject({ tasks: [], total: 0 });
  });

  it("filtra e pagina a fila sem expor tarefas de terceiros", async () => {
    await expect(tasks.listMine(memberId, { order: "desc", page: 1, pageSize: 1, search: "Aprova", status: "pending", organizationId })).resolves.toMatchObject({ total: 1, totalPages: 1, page: 1 });
    await expect(tasks.listMine(memberId, { order: "desc", page: 1, pageSize: 10, search: "inexistente" })).resolves.toMatchObject({ tasks: [], total: 0 });
  });
});

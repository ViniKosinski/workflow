import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import {
  archiveWorkflowDefinition,
  createWorkflowDefinition,
  createWorkflowDefinitionRevision,
  publishWorkflowDefinition,
  startWorkflowDefinitionRun,
} from "@/modules/workflowDefinitions/application/workflowDefinitionUseCases";
import {
  WorkflowDefinitionError,
  WorkflowDefinitionService,
} from "@/modules/workflowDefinitions/domain/workflowDefinition";
import { WorkflowDefinitionConcurrencyError } from "@/modules/workflowDefinitions/domain/workflowDefinitionRepository";
import { PrismaWorkflowDefinitionRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowDefinitionRepository";
import { PrismaWorkflowRunRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowRunRepository";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { WorkflowAssignmentService } from "@/modules/workflows/domain/workflowEngine";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { PrismaWorkflowPersistenceRepository } from "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository";
import { WorkflowConcurrencyError } from "@/modules/workflows/domain/workflowPersistenceRepository";
import { cancelPersistedWorkflow } from "@/modules/workflows/application/cancelPersistedWorkflow";
import { WorkflowValidationError } from "@/modules/workflows/application/workflowUseCaseErrors";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("workflow definition hardening", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const organizationId = `hardening-org-${suffix}`;
  const otherOrganizationId = `hardening-other-org-${suffix}`;
  const ownerId = `hardening-owner-${suffix}`;
  const externalUserId = `hardening-external-${suffix}`;

  function dependencies() {
    const ids = { create: () => crypto.randomUUID() };
    return {
      definitions: new PrismaWorkflowDefinitionRepository(organizationId, prisma),
      runs: new PrismaWorkflowRunRepository(organizationId, prisma),
      service: new WorkflowDefinitionService(),
      workflowEngine: createWorkflowEngine({
        clock: { now: () => new Date().toISOString() },
        idGenerator: {
          createWorkflowId: ids.create,
          createStepId: ids.create,
          createEventId: ids.create,
          createTransitionId: ids.create,
        },
      }),
      authorization: { require: async () => undefined },
      memberships: new PrismaMembershipRepository(prisma),
      assignments: new WorkflowAssignmentService(),
      organizationId,
      clock: { now: () => new Date().toISOString() },
      ids,
    };
  }

  function command(assigneeUserId = ownerId) {
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();
    return {
      name: "Definição concorrente",
      steps: [
        {
          id: firstId,
          name: "Análise",
          order: 1,
          assignee: { type: "user" as const, userId: assigneeUserId },
          transitions: [{
            id: crypto.randomUUID(),
            name: "Continuar",
            result: "continue",
            targetStepId: secondId,
            endsWorkflow: false,
          }],
        },
        {
          id: secondId,
          name: "Finalizar",
          order: 2,
          assignee: { type: "user" as const, userId: assigneeUserId },
          transitions: [{
            id: crypto.randomUUID(),
            name: "Finalizar",
            result: "done",
            endsWorkflow: true,
          }],
        },
      ],
    };
  }

  async function publishedDefinition() {
    const deps = dependencies();
    const draft = await createWorkflowDefinition(deps, command(), ownerId);
    return {
      deps,
      published: await publishWorkflowDefinition(deps, draft.id, ownerId),
    };
  }

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { id: ownerId, email: `${ownerId}@test.invalid`, normalizedEmail: `${ownerId}@test.invalid`, name: "Owner" },
        { id: externalUserId, email: `${externalUserId}@test.invalid`, normalizedEmail: `${externalUserId}@test.invalid`, name: "External" },
      ],
    });
    await prisma.organization.createMany({
      data: [
        { id: organizationId, name: "Hardening" },
        { id: otherOrganizationId, name: "Other" },
      ],
    });
    await prisma.organizationMembership.createMany({
      data: [
        { organizationId, userId: ownerId, role: "OWNER" },
        { organizationId: otherOrganizationId, userId: externalUserId, role: "OWNER" },
      ],
    });
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { workflowDefinition: { organizationId } } });
    await prisma.workflowDefinition.deleteMany({ where: { organizationId } });
    await prisma.organization.deleteMany({ where: { id: { in: [organizationId, otherOrganizationId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [ownerId, externalUserId] } } });
    await prisma.$disconnect();
  });

  it("rejeita atribuição a usuário de outra organização antes da persistência", async () => {
    const deps = dependencies();
    await expect(createWorkflowDefinition(deps, command(externalUserId), ownerId))
      .rejects.toBeInstanceOf(WorkflowValidationError);
    expect(await prisma.workflowDefinition.count({
      where: { organizationId, steps: { some: { assigneeUserId: externalUserId } } },
    })).toBe(0);
  });

  it("serializa criação concorrente de revisão e exige a revisão publicada corrente", async () => {
    const { deps, published } = await publishedDefinition();
    const attempts = await Promise.allSettled([
      createWorkflowDefinitionRevision(deps, published.id, ownerId),
      createWorkflowDefinitionRevision(deps, published.id, ownerId),
    ]);
    expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((item) => item.status === "rejected")).toHaveLength(1);
    expect((attempts.find((item) => item.status === "rejected") as PromiseRejectedResult).reason)
      .toBeInstanceOf(WorkflowDefinitionConcurrencyError);

    const revision = (attempts.find((item) => item.status === "fulfilled") as PromiseFulfilledResult<Awaited<ReturnType<typeof createWorkflowDefinitionRevision>>>).value;
    await publishWorkflowDefinition(deps, revision.id, ownerId);
    await expect(createWorkflowDefinitionRevision(deps, published.id, ownerId))
      .rejects.toBeInstanceOf(WorkflowDefinitionError);

    const records = await prisma.workflowDefinition.findMany({
      where: { organizationId, definitionKey: published.definitionKey },
      select: { id: true, status: true },
    });
    expect(records.filter((item) => item.status === "PUBLISHED")).toEqual([
      expect.objectContaining({ id: revision.id }),
    ]);
    expect(records.find((item) => item.id === published.id)?.status).toBe("ARCHIVED");
  });

  it("mantém somente uma revisão publicada sob publicação concorrente", async () => {
    const { deps, published } = await publishedDefinition();
    const revision = await createWorkflowDefinitionRevision(deps, published.id, ownerId);
    const attempts = await Promise.allSettled([
      publishWorkflowDefinition(deps, revision.id, ownerId),
      publishWorkflowDefinition(deps, revision.id, ownerId),
    ]);
    expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.workflowDefinition.count({
      where: { organizationId, definitionKey: published.definitionKey, status: "PUBLISHED" },
    })).toBe(1);
  });

  it("serializa archive e start run sem criar execução a partir de leitura obsoleta", async () => {
    const { deps, published } = await publishedDefinition();
    const attempts = await Promise.allSettled([
      archiveWorkflowDefinition(deps, published.id),
      startWorkflowDefinitionRun(deps, published.id, ownerId),
    ]);
    expect(attempts[0].status).toBe("fulfilled");
    expect((await deps.definitions.findById(published.id))?.status).toBe("archived");
    expect(await prisma.workflowRun.count({ where: { workflowDefinitionId: published.id } }))
      .toBe(attempts[1].status === "fulfilled" ? 1 : 0);
  });

  it("faz mutações legadas usarem WorkflowRun.version e preserva a definição", async () => {
    const { deps, published } = await publishedDefinition();
    const run = await startWorkflowDefinitionRun(deps, published.id, ownerId);
    const legacy = new PrismaWorkflowPersistenceRepository(organizationId, prisma, ownerId);
    const runRepository = new PrismaWorkflowRunRepository(organizationId, prisma);
    const [legacySnapshot, currentSnapshot] = await Promise.all([
      legacy.findById(run.id),
      runRepository.findById(run.id),
    ]);
    if (!legacySnapshot || !currentSnapshot) throw new Error("Execução não encontrada.");

    const first = deps.workflowEngine.cancelWorkflow({ workflow: legacySnapshot, reason: "Operação legada." });
    const second = deps.workflowEngine.cancelWorkflow({ workflow: currentSnapshot, reason: "Operação concorrente." });
    if (!first.success || !second.success) throw new Error("Não foi possível preparar a concorrência.");

    const attempts = await Promise.allSettled([
      legacy.update(first.data),
      runRepository.update(second.data),
    ]);
    expect(attempts.filter((item) => item.status === "fulfilled")).toHaveLength(1);
    expect((attempts.find((item) => item.status === "rejected") as PromiseRejectedResult).reason)
      .toBeInstanceOf(WorkflowConcurrencyError);
    expect((await deps.definitions.findById(published.id))?.lockVersion).toBe(published.lockVersion);
  });

  it("permite cancelamento legado de uma execução cujo id difere da definição", async () => {
    const { deps, published } = await publishedDefinition();
    const run = await startWorkflowDefinitionRun(deps, published.id, ownerId);
    const cancelled = await cancelPersistedWorkflow({
      workflowEngine: deps.workflowEngine,
      workflowRepository: new PrismaWorkflowPersistenceRepository(organizationId, prisma, ownerId),
      authorization: { require: async () => undefined },
    }, { workflowId: run.id, reason: "Cancelamento compatível." });
    expect(cancelled.id).toBe(run.id);
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.definitionId).toBe(published.id);
    expect((await deps.definitions.findById(published.id))?.lockVersion).toBe(published.lockVersion);
  });
});

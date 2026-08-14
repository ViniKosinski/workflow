import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { WorkflowDefinitionService } from "@/modules/workflowDefinitions/domain/workflowDefinition";
import { PrismaWorkflowDefinitionRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowDefinitionRepository";
import { PrismaWorkflowRunRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowRunRepository";
import { PrismaWorkflowRunFormRepository } from "@/modules/workflowDefinitions/infrastructure/prismaWorkflowRunFormRepository";
import { WorkflowFormService } from "@/modules/workflowDefinitions/domain/workflowForm";
import { createWorkflowEngine } from "@/modules/workflows/domain/workflowEngineService";
import { startWorkflowDefinitionRun } from "@/modules/workflowDefinitions/application/workflowDefinitionUseCases";
import { WorkflowAssignmentService } from "@/modules/workflows/domain/workflowEngine";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { WorkflowConcurrencyError } from "@/modules/workflows/domain/workflowPersistenceRepository";
import { updateWorkflowRunFormValues } from "@/modules/workflowDefinitions/application/workflowFormUseCases";
import { WorkflowBusinessError } from "@/modules/workflows/application/workflowUseCaseErrors";
import { completeTask } from "@/modules/tasks/application/completeTask";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("dynamic workflow forms", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const organizationId = `forms-org-${suffix}`;
  const userId = `forms-user-${suffix}`;
  const service = new WorkflowDefinitionService();
  const definitions = new PrismaWorkflowDefinitionRepository(organizationId, prisma);
  const runs = new PrismaWorkflowRunRepository(organizationId, prisma);
  const runForms = new PrismaWorkflowRunFormRepository(organizationId, prisma);
  const ids = { create: () => crypto.randomUUID() };
  const engine = createWorkflowEngine({
    clock: { now: () => new Date().toISOString() },
    idGenerator: { createWorkflowId: ids.create, createStepId: ids.create, createEventId: ids.create, createTransitionId: ids.create },
  });
  const dependencies = {
    definitions, runs, runForms, service, forms: new WorkflowFormService(), workflowEngine: engine,
    authorization: { require: async () => undefined },
    memberships: new PrismaMembershipRepository(prisma), assignments: new WorkflowAssignmentService(),
    organizationId, clock: { now: () => new Date().toISOString() }, ids,
  };
  let definitionId: string;
  let baselineRunId: string;

  beforeAll(async () => {
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid`, normalizedEmail: `${userId}@test.invalid`, name: "Forms" } });
    await prisma.organization.create({ data: { id: organizationId, name: "Forms" } });
    await prisma.organizationMembership.create({ data: { organizationId, userId, role: "OWNER" } });
    const stepId = crypto.randomUUID();
    const draft = service.create({
      id: crypto.randomUUID(), name: "Form workflow", createdByUserId: userId, now: new Date().toISOString(),
      steps: [{ id: stepId, name: "Execute", order: 1, assignee: { type: "user", userId }, transitions: [{ id: crypto.randomUUID(), name: "Done", result: "done", endsWorkflow: true }] }],
      form: [
        { id: crypto.randomUUID(), key: "customer", label: "Cliente", type: "text", required: true, order: 1, options: [] },
        { id: crypto.randomUUID(), key: "priority", label: "Prioridade", type: "select", required: false, order: 2, defaultValue: "normal", options: [
          { id: crypto.randomUUID(), value: "normal", label: "Normal", order: 1 },
          { id: crypto.randomUUID(), value: "high", label: "Alta", order: 2 },
        ] },
      ],
    });
    await definitions.create(draft);
    definitionId = draft.id;
    await definitions.publish(service.publish(draft, userId, new Date().toISOString()));
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { workflowDefinition: { organizationId } } });
    await prisma.workflowDefinition.deleteMany({ where: { organizationId } });
    await prisma.organization.delete({ where: { id: organizationId } });
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("cria snapshots e valores independentes para múltiplas execuções", async () => {
    const first = await startWorkflowDefinitionRun(dependencies, definitionId, userId);
    baselineRunId = first.id;
    const second = await startWorkflowDefinitionRun(dependencies, definitionId, userId);
    const firstForm = await runForms.find(first.id);
    const secondForm = await runForms.find(second.id);
    expect(firstForm?.fields.map((field) => field.key)).toEqual(["customer", "priority"]);
    expect(firstForm?.fields[0].id).not.toBe(secondForm?.fields[0].id);
    expect(firstForm?.values.priority).toBe("normal");
    await runForms.updateValues(first.id, first.version, { customer: "ACME", priority: "high" }, userId);
    expect((await runForms.find(first.id))?.values).toMatchObject({ customer: "ACME", priority: "high" });
    expect((await runForms.find(second.id))?.values.customer).toBeNull();
  });

  it("copia formulário na revisão com ids novos e preserva snapshots antigos", async () => {
    const published = (await definitions.findById(definitionId))!;
    const revision = service.createRevision(published, {
      id: crypto.randomUUID(),
      stepIds: published.steps.map(() => crypto.randomUUID()),
      transitionIds: published.steps.flatMap((step) => step.transitions.map(() => crypto.randomUUID())),
      formFieldIds: published.form.map(() => crypto.randomUUID()),
      formOptionIds: published.form.flatMap((field) => field.options.map(() => crypto.randomUUID())),
      actorUserId: userId,
      now: new Date().toISOString(),
    });
    const persisted = await definitions.createRevision(published, revision);
    expect(persisted.form.map((field) => field.key)).toEqual(published.form.map((field) => field.key));
    expect(persisted.form[0].id).not.toBe(published.form[0].id);
    expect(persisted.form[1].options[0].id).not.toBe(published.form[1].options[0].id);
    const edited = service.updateDraft(persisted, {
      name: persisted.name,
      steps: persisted.steps,
      form: [...persisted.form, {
        id: crypto.randomUUID(), key: "revision_only", label: "Somente revisão 2",
        type: "text", required: false, order: 3, options: [],
      }],
      now: new Date().toISOString(),
    });
    const saved = await definitions.update(edited);
    const publishedRevision = await definitions.publish(service.publish(saved, userId, new Date().toISOString()));
    const nextRun = await startWorkflowDefinitionRun(dependencies, publishedRevision.id, userId);
    expect((await runForms.find(baselineRunId))?.fields.some((field) => field.key === "revision_only")).toBe(false);
    expect((await runForms.find(nextRun.id))?.fields.some((field) => field.key === "revision_only")).toBe(true);
  });

  it("rejeita duas atualizações de valores baseadas na mesma versão", async () => {
    const published = (await definitions.list({ status: "published" }))[0];
    const run = await startWorkflowDefinitionRun(dependencies, published.id, userId);
    const results = await Promise.allSettled([
      runForms.updateValues(run.id, run.version, { customer: "A" }, userId),
      runForms.updateValues(run.id, run.version, { customer: "B" }, userId),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((results.find((result) => result.status === "rejected") as PromiseRejectedResult).reason).toBeInstanceOf(WorkflowConcurrencyError);
  });

  it.each(["COMPLETED", "CANCELLED", "FAILED"] as const)("rejeita alteração após estado terminal %s", async (status) => {
    const published = (await definitions.list({ status: "published" }))[0];
    const run = await startWorkflowDefinitionRun(dependencies, published.id, userId);
    await prisma.workflowRun.update({ where: { id: run.id }, data: { status } });
    await expect(updateWorkflowRunFormValues(dependencies, run.id, run.version, {
      customer: "ACME",
    }, userId)).rejects.toBeInstanceOf(WorkflowBusinessError);
    expect((await prisma.workflowRun.findUniqueOrThrow({ where: { id: run.id } })).version).toBe(run.version);
  });

  it("faz rollback completo quando falha após adquirir a versão", async () => {
    const published = (await definitions.list({ status: "published" }))[0];
    const run = await startWorkflowDefinitionRun(dependencies, published.id, userId);
    await expect(runForms.updateValues(run.id, run.version, { unknown: "value" }, userId)).rejects.toThrow();
    expect((await prisma.workflowRun.findUniqueOrThrow({ where: { id: run.id } })).version).toBe(run.version);
    expect(await prisma.workflowRunFormValue.count({ where: { workflowRunId: run.id } })).toBe(0);
  });

  it("impede no banco associar valor ao campo de outra execução", async () => {
    const published = (await definitions.list({ status: "published" }))[0];
    const first = await startWorkflowDefinitionRun(dependencies, published.id, userId);
    const second = await startWorkflowDefinitionRun(dependencies, published.id, userId);
    const foreignField = await prisma.workflowRunFormField.findFirstOrThrow({ where: { workflowRunId: second.id } });
    await expect(prisma.workflowRunFormValue.create({
      data: { workflowRunId: first.id, fieldId: foreignField.id, value: "invalid", updatedByUserId: userId },
    })).rejects.toMatchObject({ code: "P2003" });
  });

  it("não expõe o formulário da execução para outra organização", async () => {
    const published = (await definitions.list({ status: "published" }))[0];
    const run = await startWorkflowDefinitionRun(dependencies, published.id, userId);
    const foreignOrganizationForms = new PrismaWorkflowRunFormRepository(
      `foreign-${organizationId}`,
      prisma,
    );

    await expect(foreignOrganizationForms.find(run.id)).resolves.toBeNull();
  });

  it("salva o formulário e conclui a tarefa atomicamente", async () => {
    const published = (await definitions.list({ status: "published" }))[0];
    const run = await startWorkflowDefinitionRun(dependencies, published.id, userId);
    const task = run.steps[0];

    const completed = await completeTask(createTaskDependencies(userId), {
      taskId: task.id,
      selectedResult: task.transitions[0].result,
      formVersion: run.version,
      formValues: { customer: "Empresa Piloto", priority: "high" },
    }, userId);

    expect(completed.status).toBe("completed");
    expect((await runForms.find(run.id))?.values).toMatchObject({
      customer: "Empresa Piloto",
      priority: "high",
    });
  });
});

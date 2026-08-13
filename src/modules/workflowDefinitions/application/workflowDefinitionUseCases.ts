import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";
import type {
  WorkflowDefinitionApplicationDependencies,
  WorkflowDefinitionCommand,
} from "@/modules/workflowDefinitions/application/workflowDefinitionApplicationTypes";
import {
  WORKFLOW_DEFINITION_STATUSES,
  type WorkflowDefinitionStatus,
} from "@/modules/workflowDefinitions/domain/workflowDefinition";
import { WorkflowDefinitionNotFoundError } from "@/modules/workflowDefinitions/domain/workflowDefinitionRepository";
import { WorkflowBusinessError, WorkflowValidationError } from "@/modules/workflows/application/workflowUseCaseErrors";
import { WorkflowAssignmentError } from "@/modules/workflows/domain/workflowEngine";

async function findDefinition(dependencies: WorkflowDefinitionApplicationDependencies, id: string) {
  const definition = await dependencies.definitions.findById(id);
  if (!definition) throw new WorkflowDefinitionNotFoundError();
  return definition;
}

function validateCommand(input: WorkflowDefinitionCommand) {
  if (!input.name.trim()) throw new WorkflowValidationError("O nome da definição é obrigatório.");
  if (input.steps.length === 0) throw new WorkflowValidationError("A definição precisa ter pelo menos uma etapa.");
  if (input.steps.some((step) => !step.id.trim() || !step.name.trim())) {
    throw new WorkflowValidationError("Todas as etapas precisam possuir identificador e nome.");
  }
}

async function validateAssignments(
  dependencies: WorkflowDefinitionApplicationDependencies,
  input: WorkflowDefinitionCommand,
) {
  const userIds = [...new Set(input.steps.flatMap((step) =>
    step.assignee.type === "user" ? [step.assignee.userId] : [],
  ))];
  const memberships = await Promise.all(
    userIds.map((userId) => dependencies.memberships.find(dependencies.organizationId, userId)),
  );
  const memberIds = new Set(memberships.flatMap((membership) => membership ? [membership.userId] : []));
  try {
    for (const step of input.steps) dependencies.assignments.requireValid(step.assignee, memberIds);
  } catch (error) {
    if (error instanceof WorkflowAssignmentError) throw new WorkflowValidationError(error.message);
    throw error;
  }
}

export async function createWorkflowDefinition(
  dependencies: WorkflowDefinitionApplicationDependencies,
  input: WorkflowDefinitionCommand,
  actorUserId: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowCreate);
  validateCommand(input);
  await validateAssignments(dependencies, input);
  return dependencies.definitions.create(dependencies.service.create({
    id: dependencies.ids.create(),
    name: input.name,
    steps: input.steps,
    createdByUserId: actorUserId,
    now: dependencies.clock.now(),
  }));
}

export async function listWorkflowDefinitions(
  dependencies: WorkflowDefinitionApplicationDependencies,
  input: Readonly<{ status?: WorkflowDefinitionStatus; limit?: number; offset?: number }> = {},
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowRead);
  return dependencies.definitions.list(input);
}

export async function getWorkflowDefinition(
  dependencies: WorkflowDefinitionApplicationDependencies,
  id: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowRead);
  return findDefinition(dependencies, id);
}

export async function updateWorkflowDefinition(
  dependencies: WorkflowDefinitionApplicationDependencies,
  id: string,
  input: WorkflowDefinitionCommand,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  validateCommand(input);
  await validateAssignments(dependencies, input);
  return dependencies.definitions.update(dependencies.service.updateDraft(
    await findDefinition(dependencies, id),
    { ...input, now: dependencies.clock.now() },
  ));
}

export async function publishWorkflowDefinition(
  dependencies: WorkflowDefinitionApplicationDependencies,
  id: string,
  actorUserId: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  return dependencies.definitions.publish(dependencies.service.publish(
    await findDefinition(dependencies, id),
    actorUserId,
    dependencies.clock.now(),
  ));
}

export async function createWorkflowDefinitionRevision(
  dependencies: WorkflowDefinitionApplicationDependencies,
  id: string,
  actorUserId: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  const source = await findDefinition(dependencies, id);
  const transitionCount = source.steps.reduce((total, step) => total + step.transitions.length, 0);
  const revision = dependencies.service.createRevision(source, {
    id: dependencies.ids.create(),
    stepIds: source.steps.map(() => dependencies.ids.create()),
    transitionIds: Array.from({ length: transitionCount }, () => dependencies.ids.create()),
    formFieldIds: source.form.map(() => dependencies.ids.create()),
    formOptionIds: source.form.flatMap((field) => field.options.map(() => dependencies.ids.create())),
    actorUserId,
    now: dependencies.clock.now(),
  });
  return dependencies.definitions.createRevision(source, revision);
}

export async function listWorkflowDefinitionRevisions(
  dependencies: WorkflowDefinitionApplicationDependencies,
  id: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowRead);
  const definition = await findDefinition(dependencies, id);
  return dependencies.definitions.listRevisions(definition.definitionKey);
}

export async function archiveWorkflowDefinition(
  dependencies: WorkflowDefinitionApplicationDependencies,
  id: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  return dependencies.definitions.archive(dependencies.service.archive(
    await findDefinition(dependencies, id),
    dependencies.clock.now(),
  ));
}

export async function startWorkflowDefinitionRun(
  dependencies: WorkflowDefinitionApplicationDependencies,
  id: string,
  actorUserId: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowExecutionManage);
  const definition = await findDefinition(dependencies, id);
  dependencies.service.requirePublished(definition);
  const runId = dependencies.ids.create();
  const stepIds = new Map(definition.steps.map((step) => [step.id, dependencies.ids.create()]));
  const created = dependencies.workflowEngine.createWorkflow({
    id: runId,
    name: definition.name,
    steps: definition.steps.map((step) => ({
      id: stepIds.get(step.id),
      name: step.name,
      order: step.order,
      assignee: step.assignee,
      transitions: step.transitions.map((transition) => ({
        ...transition,
        id: dependencies.ids.create(),
        targetStepId: transition.targetStepId ? stepIds.get(transition.targetStepId) : undefined,
      })),
    })),
  });
  if (!created.success) throw new WorkflowBusinessError(created.error.message);
  const prepared = dependencies.workflowEngine.prepareWorkflow({ workflow: created.data });
  if (!prepared.success) throw new WorkflowBusinessError(prepared.error.message);
  const started = dependencies.workflowEngine.startExecution({ workflow: prepared.data });
  if (!started.success) throw new WorkflowBusinessError(started.error.message);
  return dependencies.runs.create(definition, started.data, actorUserId);
}

export async function listWorkflowRuns(
  dependencies: WorkflowDefinitionApplicationDependencies,
  input: Readonly<{ definitionId?: string; limit?: number; offset?: number }> = {},
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowRead);
  return dependencies.runs.list(input);
}

export async function getWorkflowRun(
  dependencies: WorkflowDefinitionApplicationDependencies,
  id: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowRead);
  const run = await dependencies.runs.findById(id);
  if (!run) throw new WorkflowDefinitionNotFoundError();
  return run;
}

export { WORKFLOW_DEFINITION_STATUSES };

import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";
import type {
  WorkflowDefinitionApplicationDependencies,
  WorkflowFormFieldCommand,
} from "@/modules/workflowDefinitions/application/workflowDefinitionApplicationTypes";
import { WorkflowDefinitionNotFoundError } from "@/modules/workflowDefinitions/domain/workflowDefinitionRepository";
import { WorkflowFormError, type WorkflowFormField, type WorkflowFormValue } from "@/modules/workflowDefinitions/domain/workflowForm";
import { WorkflowBusinessError } from "@/modules/workflows/application/workflowUseCaseErrors";
import { WorkflowConcurrencyError } from "@/modules/workflows/domain/workflowPersistenceRepository";

async function definition(dependencies: WorkflowDefinitionApplicationDependencies, id: string) {
  const found = await dependencies.definitions.findById(id);
  if (!found) throw new WorkflowDefinitionNotFoundError();
  return found;
}

function fieldFromCommand(
  dependencies: WorkflowDefinitionApplicationDependencies,
  command: WorkflowFormFieldCommand,
  id = dependencies.ids.create(),
): WorkflowFormField {
  return {
    ...command,
    id,
    key: command.key.trim(),
    label: command.label.trim(),
    description: command.description?.trim() || undefined,
    options: command.options.map((option) => ({ ...option, id: dependencies.ids.create() })),
  };
}

export async function listWorkflowDefinitionForm(dependencies: WorkflowDefinitionApplicationDependencies, definitionId: string) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowRead);
  return (await definition(dependencies, definitionId)).form;
}

export async function addWorkflowDefinitionFormField(
  dependencies: WorkflowDefinitionApplicationDependencies,
  definitionId: string,
  command: WorkflowFormFieldCommand,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  const current = await definition(dependencies, definitionId);
  const field = fieldFromCommand(dependencies, command);
  const updated = dependencies.service.updateDraft(current, {
    name: current.name,
    steps: current.steps,
    form: [...current.form, field],
    now: dependencies.clock.now(),
  });
  return dependencies.definitions.update(updated);
}

export async function updateWorkflowDefinitionFormField(
  dependencies: WorkflowDefinitionApplicationDependencies,
  definitionId: string,
  fieldId: string,
  command: WorkflowFormFieldCommand,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  const current = await definition(dependencies, definitionId);
  if (!current.form.some((field) => field.id === fieldId)) throw new WorkflowDefinitionNotFoundError();
  return dependencies.definitions.update(dependencies.service.updateDraft(current, {
    name: current.name,
    steps: current.steps,
    form: current.form.map((field) => field.id === fieldId ? fieldFromCommand(dependencies, command, field.id) : field),
    now: dependencies.clock.now(),
  }));
}

export async function removeWorkflowDefinitionFormField(
  dependencies: WorkflowDefinitionApplicationDependencies,
  definitionId: string,
  fieldId: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  const current = await definition(dependencies, definitionId);
  if (!current.form.some((field) => field.id === fieldId)) throw new WorkflowDefinitionNotFoundError();
  const form = current.form.filter((field) => field.id !== fieldId).map((field, index) => ({ ...field, order: index + 1 }));
  return dependencies.definitions.update(dependencies.service.updateDraft(current, {
    name: current.name, steps: current.steps, form, now: dependencies.clock.now(),
  }));
}

export async function reorderWorkflowDefinitionFormFields(
  dependencies: WorkflowDefinitionApplicationDependencies,
  definitionId: string,
  orderedFieldIds: ReadonlyArray<string>,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowDefinitionUpdate);
  const current = await definition(dependencies, definitionId);
  if (orderedFieldIds.length !== current.form.length || new Set(orderedFieldIds).size !== current.form.length) {
    throw new WorkflowFormError("A reordenação deve incluir todos os campos.");
  }
  const fields = new Map(current.form.map((field) => [field.id, field]));
  const form = orderedFieldIds.map((id, index) => {
    const field = fields.get(id);
    if (!field) throw new WorkflowFormError("Campo de formulário não encontrado.");
    return { ...field, order: index + 1 };
  });
  return dependencies.definitions.update(dependencies.service.updateDraft(current, {
    name: current.name, steps: current.steps, form, now: dependencies.clock.now(),
  }));
}

export async function getWorkflowRunForm(dependencies: WorkflowDefinitionApplicationDependencies, runId: string) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowRead);
  const form = await dependencies.runForms.find(runId);
  if (!form) throw new WorkflowDefinitionNotFoundError();
  return form;
}

export async function updateWorkflowRunFormValues(
  dependencies: WorkflowDefinitionApplicationDependencies,
  runId: string,
  expectedVersion: number,
  values: Readonly<Record<string, unknown>>,
  actorUserId: string,
) {
  await dependencies.authorization.require(ORGANIZATION_PERMISSIONS.workflowExecutionManage);
  const form = await dependencies.runForms.find(runId);
  if (!form) throw new WorkflowDefinitionNotFoundError();
  const workflow = await dependencies.runs.findById(runId);
  if (!workflow) throw new WorkflowDefinitionNotFoundError();
  if (workflow.version !== expectedVersion || form.version !== expectedVersion) throw new WorkflowConcurrencyError(runId);
  const allowed = dependencies.workflowEngine.validateFormValuesUpdate(workflow);
  if (!allowed.success) throw new WorkflowBusinessError(allowed.error.message);
  const normalized = dependencies.forms.normalizeValues(form.fields, values, true) as Readonly<Record<string, WorkflowFormValue>>;
  return dependencies.runForms.updateValues(runId, expectedVersion, normalized, actorUserId);
}

import { WorkflowDecisionEngine } from "@/modules/workflows/domain/workflowDecisionEngine";
import type { StepAssignee, Workflow, WorkflowStepTransition } from "@/modules/workflows/domain/workflowEngine";
import { WorkflowFormService, type WorkflowFormField } from "@/modules/workflowDefinitions/domain/workflowForm";

export const WORKFLOW_DEFINITION_STATUSES = {
  draft: "draft",
  published: "published",
  archived: "archived",
} as const;

export type WorkflowDefinitionStatus =
  (typeof WORKFLOW_DEFINITION_STATUSES)[keyof typeof WORKFLOW_DEFINITION_STATUSES];

export type WorkflowDefinitionStep = Readonly<{
  id: string;
  name: string;
  order: number;
  slaDurationHours?: number;
  assignee: StepAssignee;
  transitions: ReadonlyArray<WorkflowStepTransition>;
}>;

export type WorkflowDefinition = Readonly<{
  id: string;
  definitionKey: string;
  revisionNumber: number;
  lockVersion: number;
  name: string;
  status: WorkflowDefinitionStatus;
  steps: ReadonlyArray<WorkflowDefinitionStep>;
  form: ReadonlyArray<WorkflowFormField>;
  createdByUserId: string;
  publishedByUserId?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
}>;

export class WorkflowDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowDefinitionError";
  }
}

export class WorkflowDefinitionService {
  constructor(
    private readonly decisions = new WorkflowDecisionEngine(),
    private readonly forms = new WorkflowFormService(),
  ) {}

  create(input: Readonly<{
    id: string;
    definitionKey?: string;
    name: string;
    steps: ReadonlyArray<WorkflowDefinitionStep>;
    form?: ReadonlyArray<WorkflowFormField>;
    createdByUserId: string;
    now: string;
  }>): WorkflowDefinition {
    const definition: WorkflowDefinition = {
      id: input.id,
      definitionKey: input.definitionKey ?? input.id,
      revisionNumber: 1,
      lockVersion: 1,
      name: input.name.trim(),
      status: WORKFLOW_DEFINITION_STATUSES.draft,
      steps: input.steps,
      form: this.forms.normalizeFields(input.form ?? []),
      createdByUserId: input.createdByUserId,
      createdAt: input.now,
      updatedAt: input.now,
    };
    this.requireValidIdentity(definition);
    return definition;
  }

  updateDraft(definition: WorkflowDefinition, input: Readonly<{
    name: string;
    steps: ReadonlyArray<WorkflowDefinitionStep>;
    form?: ReadonlyArray<WorkflowFormField>;
    now: string;
  }>): WorkflowDefinition {
    this.requireDraft(definition);
    const updated = { ...definition, name: input.name.trim(), steps: input.steps, form: this.forms.normalizeFields(input.form ?? definition.form), updatedAt: input.now };
    this.requireValidIdentity(updated);
    return updated;
  }

  publish(definition: WorkflowDefinition, actorUserId: string, now: string): WorkflowDefinition {
    this.requireDraft(definition);
    this.decisions.validate(this.asValidationWorkflow(definition));
    this.forms.validate(definition.form);
    return {
      ...definition,
      status: WORKFLOW_DEFINITION_STATUSES.published,
      publishedAt: now,
      publishedByUserId: actorUserId,
      updatedAt: now,
    };
  }

  createRevision(definition: WorkflowDefinition, input: Readonly<{
    id: string;
    stepIds: ReadonlyArray<string>;
    transitionIds: ReadonlyArray<string>;
    formFieldIds: ReadonlyArray<string>;
    formOptionIds: ReadonlyArray<string>;
    actorUserId: string;
    now: string;
  }>): WorkflowDefinition {
    if (definition.status !== WORKFLOW_DEFINITION_STATUSES.published) {
      throw new WorkflowDefinitionError("Somente uma revisão publicada pode originar uma nova revisão.");
    }
    if (input.stepIds.length !== definition.steps.length) {
      throw new WorkflowDefinitionError("Identificadores insuficientes para copiar as etapas.");
    }
    const stepIdMap = new Map(definition.steps.map((step, index) => [step.id, input.stepIds[index]]));
    let transitionIndex = 0;
    const steps = definition.steps.map((step, index) => ({
      ...step,
      id: input.stepIds[index],
      transitions: step.transitions.map((transition) => ({
        ...transition,
        id: input.transitionIds[transitionIndex++],
        targetStepId: transition.targetStepId ? stepIdMap.get(transition.targetStepId) : undefined,
      })),
    }));
    if (transitionIndex !== input.transitionIds.length) {
      throw new WorkflowDefinitionError("Identificadores de transição inconsistentes.");
    }
    if (input.formFieldIds.length !== definition.form.length) throw new WorkflowDefinitionError("Identificadores insuficientes para copiar o formulário.");
    let optionIndex = 0;
    const form = definition.form.map((field, index) => ({
      ...field,
      id: input.formFieldIds[index],
      options: field.options.map((option) => ({ ...option, id: input.formOptionIds[optionIndex++] })),
    }));
    if (optionIndex !== input.formOptionIds.length) throw new WorkflowDefinitionError("Identificadores de opção inconsistentes.");
    return {
      id: input.id,
      definitionKey: definition.definitionKey,
      revisionNumber: definition.revisionNumber + 1,
      lockVersion: 1,
      name: definition.name,
      status: WORKFLOW_DEFINITION_STATUSES.draft,
      steps,
      form,
      createdByUserId: input.actorUserId,
      createdAt: input.now,
      updatedAt: input.now,
    };
  }

  archive(definition: WorkflowDefinition, now: string): WorkflowDefinition {
    if (definition.status === WORKFLOW_DEFINITION_STATUSES.archived) {
      throw new WorkflowDefinitionError("A definição já está arquivada.");
    }
    return { ...definition, status: WORKFLOW_DEFINITION_STATUSES.archived, archivedAt: now, updatedAt: now };
  }

  requirePublished(definition: WorkflowDefinition) {
    if (definition.status !== WORKFLOW_DEFINITION_STATUSES.published) {
      throw new WorkflowDefinitionError("Somente uma revisão publicada pode iniciar execuções.");
    }
  }

  private requireDraft(definition: WorkflowDefinition) {
    if (definition.status !== WORKFLOW_DEFINITION_STATUSES.draft) {
      throw new WorkflowDefinitionError("Somente revisões em rascunho podem ser alteradas.");
    }
  }

  private requireValidIdentity(definition: WorkflowDefinition) {
    if (!definition.id.trim() || !definition.definitionKey.trim() || !definition.name.trim() ||
      !Number.isInteger(definition.revisionNumber) || definition.revisionNumber < 1 ||
      !Number.isInteger(definition.lockVersion) || definition.lockVersion < 1 ||
      definition.steps.length === 0) {
      throw new WorkflowDefinitionError("Definição de workflow inválida.");
    }
    if (definition.steps.some((step) => step.slaDurationHours !== undefined &&
      (!Number.isInteger(step.slaDurationHours) || step.slaDurationHours < 1 || step.slaDurationHours > 8_760))) {
      throw new WorkflowDefinitionError("O prazo da etapa deve ser informado em horas inteiras, entre 1 e 8760.");
    }
  }

  private asValidationWorkflow(definition: WorkflowDefinition): Workflow {
    return {
      id: definition.id,
      version: definition.lockVersion,
      name: definition.name,
      status: "draft",
      steps: definition.steps.map((step) => ({ ...step, status: "pending", priority: "normal" })),
      executionHistory: [],
      createdAt: definition.createdAt,
      updatedAt: definition.updatedAt,
    };
  }
}

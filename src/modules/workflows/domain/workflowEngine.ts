export const WORKFLOW_STATUSES = {
  draft: "draft",
  ready: "ready",
  running: "running",
  completed: "completed",
  failed: "failed",
  cancelled: "cancelled",
} as const;

export type WorkflowStatus =
  (typeof WORKFLOW_STATUSES)[keyof typeof WORKFLOW_STATUSES];

export const WORKFLOW_STATUS_LABELS: Readonly<Record<WorkflowStatus, string>> = {
  draft: "Rascunho",
  ready: "Pronto",
  running: "Em execução",
  completed: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

export const TERMINAL_WORKFLOW_STATUSES: ReadonlyArray<WorkflowStatus> = [
  WORKFLOW_STATUSES.completed,
  WORKFLOW_STATUSES.failed,
  WORKFLOW_STATUSES.cancelled,
];

export const WORKFLOW_STEP_STATUSES = {
  pending: "pending",
  running: "running",
  completed: "completed",
  failed: "failed",
  skipped: "skipped",
} as const;

export type WorkflowStepStatus =
  (typeof WORKFLOW_STEP_STATUSES)[keyof typeof WORKFLOW_STEP_STATUSES];

export const WORKFLOW_STEP_STATUS_LABELS: Readonly<
  Record<WorkflowStepStatus, string>
> = {
  pending: "Pendente",
  running: "Em execução",
  completed: "Concluída",
  failed: "Falhou",
  skipped: "Ignorada",
};

export type WorkflowTransition = Readonly<{
  from: WorkflowStatus;
  to: WorkflowStatus;
}>;

export const ALLOWED_WORKFLOW_TRANSITIONS = [
  {
    from: WORKFLOW_STATUSES.draft,
    to: WORKFLOW_STATUSES.ready,
  },
  {
    from: WORKFLOW_STATUSES.draft,
    to: WORKFLOW_STATUSES.cancelled,
  },
  {
    from: WORKFLOW_STATUSES.ready,
    to: WORKFLOW_STATUSES.running,
  },
  {
    from: WORKFLOW_STATUSES.ready,
    to: WORKFLOW_STATUSES.cancelled,
  },
  {
    from: WORKFLOW_STATUSES.running,
    to: WORKFLOW_STATUSES.completed,
  },
  {
    from: WORKFLOW_STATUSES.running,
    to: WORKFLOW_STATUSES.failed,
  },
  {
    from: WORKFLOW_STATUSES.running,
    to: WORKFLOW_STATUSES.cancelled,
  },
] as const satisfies ReadonlyArray<WorkflowTransition>;

const WORKFLOW_STATUS_VALUES = Object.values(WORKFLOW_STATUSES);

export const PROHIBITED_WORKFLOW_TRANSITIONS: ReadonlyArray<WorkflowTransition> =
  WORKFLOW_STATUS_VALUES.flatMap((from) =>
    WORKFLOW_STATUS_VALUES.map((to) => ({ from, to })),
  ).filter(
    (transition) =>
      transition.from !== transition.to &&
      !ALLOWED_WORKFLOW_TRANSITIONS.some(
        (allowedTransition) =>
          allowedTransition.from === transition.from &&
          allowedTransition.to === transition.to,
      ),
  );

export const WORKFLOW_EVENT_TYPES = {
  workflowCreated: "workflow.created",
  workflowPrepared: "workflow.prepared",
  workflowStepAdded: "workflow.step_added",
  workflowStepRenamed: "workflow.step_renamed",
  workflowStepAssigned: "workflow.step_assigned",
  workflowTransitionAdded: "workflow.transition_added",
  workflowTransitionUpdated: "workflow.transition_updated",
  workflowTransitionRemoved: "workflow.transition_removed",
  workflowStepRemoved: "workflow.step_removed",
  workflowStepsReordered: "workflow.steps_reordered",
  executionStarted: "execution.started",
  workflowCompleted: "workflow.completed",
  workflowFailed: "workflow.failed",
  workflowCancelled: "workflow.cancelled",
  workflowTransitionBlocked: "workflow.transition_blocked",
} as const;

export type WorkflowEventType =
  (typeof WORKFLOW_EVENT_TYPES)[keyof typeof WORKFLOW_EVENT_TYPES];

export const WORKFLOW_STEP_EVENT_TYPES = {
  stepStarted: "step.started",
  stepCompleted: "step.completed",
  stepFailed: "step.failed",
  stepSkipped: "step.skipped",
  stepTransitionBlocked: "step.transition_blocked",
} as const;

export type WorkflowStepEventType =
  (typeof WORKFLOW_STEP_EVENT_TYPES)[keyof typeof WORKFLOW_STEP_EVENT_TYPES];

export type WorkflowId = string;
export type WorkflowStepId = string;
export type WorkflowExecutionEventId = string;
export type IsoDateString = string;

export type WorkflowExecutionMetadataValue =
  | string
  | number
  | boolean
  | null;

export type WorkflowExecutionMetadata = Readonly<
  Record<string, WorkflowExecutionMetadataValue>
>;

export type WorkflowStepCompletionResult = Readonly<{
  selectedResult?: string;
  observation?: string;
  message?: string;
  metadata?: WorkflowExecutionMetadata;
}>;

export type WorkflowStepFailureResult = Readonly<{
  reason: string;
  metadata?: WorkflowExecutionMetadata;
}>;

export type WorkflowStep = Readonly<{
  id: WorkflowStepId;
  name: string;
  order: number;
  status: WorkflowStepStatus;
  executionResult?: WorkflowStepCompletionResult;
  startedAt?: IsoDateString;
  finishedAt?: IsoDateString;
  errorMessage?: string;
  assignee: StepAssignee;
  priority?: "normal";
  transitions: ReadonlyArray<WorkflowStepTransition>;
}>;

export type WorkflowStepTransition = Readonly<{
  id: string;
  name: string;
  description?: string;
  result: string;
  targetStepId?: WorkflowStepId;
  endsWorkflow: boolean;
}>;

export type StepAssignee =
  | Readonly<{ type: "user"; userId: string }>
  | Readonly<{ type: "role"; role: "owner" | "admin" | "editor" | "viewer" }>;

export class WorkflowAssignmentError extends Error {
  constructor(message: string) { super(message); this.name = "WorkflowAssignmentError"; }
}

export class WorkflowAssignmentService {
  requireValid(assignee: StepAssignee, organizationMemberIds: ReadonlySet<string>) {
    if (assignee.type === "user") {
      if (!assignee.userId.trim() || !organizationMemberIds.has(assignee.userId)) {
        throw new WorkflowAssignmentError("O responsável precisa ser membro da organização.");
      }
      return;
    }
    if (!["owner", "admin", "editor", "viewer"].includes(assignee.role)) {
      throw new WorkflowAssignmentError("Papel responsável inválido.");
    }
  }
}

export type BaseWorkflowExecutionEvent = Readonly<{
  id: WorkflowExecutionEventId;
  workflowId: WorkflowId;
  timestamp: IsoDateString;
  message: string;
  metadata?: WorkflowExecutionMetadata;
  error?: string;
}>;

export type WorkflowLifecycleEvent = BaseWorkflowExecutionEvent &
  Readonly<{
    type: WorkflowEventType;
    fromStatus?: WorkflowStatus;
    toStatus?: WorkflowStatus;
  }>;

export type WorkflowStepExecutionEvent = BaseWorkflowExecutionEvent &
  Readonly<{
    type: WorkflowStepEventType;
    stepId: WorkflowStepId;
    fromStatus?: WorkflowStepStatus;
    toStatus?: WorkflowStepStatus;
  }>;

export type WorkflowExecutionEvent =
  | WorkflowLifecycleEvent
  | WorkflowStepExecutionEvent;

export type Workflow = Readonly<{
  id: WorkflowId;
  definitionId?: string;
  definitionRevision?: number;
  version: number;
  name: string;
  status: WorkflowStatus;
  steps: ReadonlyArray<WorkflowStep>;
  currentStepId?: WorkflowStepId;
  executionHistory: ReadonlyArray<WorkflowExecutionEvent>;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  startedAt?: IsoDateString;
  finishedAt?: IsoDateString;
  failureReason?: string;
  cancellationReason?: string;
}>;

export type CreateWorkflowInput = Readonly<{
  id?: WorkflowId;
  name: string;
  steps: ReadonlyArray<
    Readonly<{
      id?: WorkflowStepId;
      name: string;
      order: number;
      assignee?: StepAssignee;
      transitions?: ReadonlyArray<Readonly<{
        id?: string;
        name: string;
        description?: string;
        result: string;
        targetStepId?: string;
        targetStepOrder?: number;
        endsWorkflow: boolean;
      }>>;
    }>
  >;
}>;

export type PrepareWorkflowInput = Readonly<{
  workflow: Workflow;
}>;

export type AddWorkflowStepInput = Readonly<{
  workflow: Workflow;
  name: string;
}>;

export type RenameWorkflowStepInput = Readonly<{
  workflow: Workflow;
  stepId: WorkflowStepId;
  name: string;
}>;

export type AssignWorkflowStepInput = Readonly<{
  workflow: Workflow;
  stepId: WorkflowStepId;
  assignee: StepAssignee;
}>;

export type RemoveWorkflowStepInput = Readonly<{
  workflow: Workflow;
  stepId: WorkflowStepId;
}>;

export type ReorderWorkflowStepsInput = Readonly<{
  workflow: Workflow;
  orderedStepIds: ReadonlyArray<WorkflowStepId>;
}>;

export type StartWorkflowExecutionInput = Readonly<{
  workflow: Workflow;
}>;

export type StartWorkflowStepInput = Readonly<{
  workflow: Workflow;
  stepId: WorkflowStepId;
}>;

export type CompleteWorkflowStepInput = Readonly<{
  workflow: Workflow;
  stepId: WorkflowStepId;
  result: WorkflowStepCompletionResult;
  executorUserId?: string;
}>;

export type AddWorkflowTransitionInput = Readonly<{ workflow: Workflow; stepId: string; transition: Omit<WorkflowStepTransition, "id"> }>;
export type UpdateWorkflowTransitionInput = Readonly<{ workflow: Workflow; stepId: string; transitionId: string; transition: Omit<WorkflowStepTransition, "id"> }>;
export type RemoveWorkflowTransitionInput = Readonly<{ workflow: Workflow; stepId: string; transitionId: string }>;

export type RegisterWorkflowFailureInput = Readonly<{
  workflow: Workflow;
  failure: WorkflowStepFailureResult;
  stepId?: WorkflowStepId;
}>;

export type CancelWorkflowInput = Readonly<{
  workflow: Workflow;
  reason: string;
}>;

export type GetWorkflowStateInput = Readonly<{
  workflow: Workflow;
}>;

export type WorkflowStateSnapshot = Readonly<{
  workflowId: WorkflowId;
  status: WorkflowStatus;
  currentStep?: WorkflowStep;
  steps: ReadonlyArray<WorkflowStep>;
  executionHistory: ReadonlyArray<WorkflowExecutionEvent>;
}>;

export type WorkflowEngineErrorCode =
  | "INVALID_WORKFLOW"
  | "INVALID_STEP"
  | "INVALID_TRANSITION"
  | "INVALID_OPERATION"
  | "MISSING_REQUIRED_REASON"
  | "WORKFLOW_ALREADY_FINISHED";

export type WorkflowEngineError = Readonly<{
  code: WorkflowEngineErrorCode;
  message: string;
  event?: WorkflowExecutionEvent;
}>;

export type WorkflowEngineResult<T> =
  | Readonly<{
      success: true;
      data: T;
      events: ReadonlyArray<WorkflowExecutionEvent>;
    }>
  | Readonly<{
      success: false;
      error: WorkflowEngineError;
      events: ReadonlyArray<WorkflowExecutionEvent>;
    }>;

export type WorkflowEngineClock = Readonly<{
  now: () => IsoDateString;
}>;

export type WorkflowEngineIdGenerator = Readonly<{
  createWorkflowId: () => WorkflowId;
  createStepId: () => WorkflowStepId;
  createEventId: () => WorkflowExecutionEventId;
  createTransitionId?: () => string;
}>;

export type WorkflowEngineDependencies = Readonly<{
  clock: WorkflowEngineClock;
  idGenerator: WorkflowEngineIdGenerator;
}>;

export type WorkflowEngineService = Readonly<{
  createWorkflow: (
    input: CreateWorkflowInput,
  ) => WorkflowEngineResult<Workflow>;
  prepareWorkflow: (
    input: PrepareWorkflowInput,
  ) => WorkflowEngineResult<Workflow>;
  addStep: (input: AddWorkflowStepInput) => WorkflowEngineResult<Workflow>;
  renameStep: (
    input: RenameWorkflowStepInput,
  ) => WorkflowEngineResult<Workflow>;
  assignStep: (input: AssignWorkflowStepInput) => WorkflowEngineResult<Workflow>;
  removeStep: (
    input: RemoveWorkflowStepInput,
  ) => WorkflowEngineResult<Workflow>;
  reorderSteps: (
    input: ReorderWorkflowStepsInput,
  ) => WorkflowEngineResult<Workflow>;
  startExecution: (
    input: StartWorkflowExecutionInput,
  ) => WorkflowEngineResult<Workflow>;
  startStep: (input: StartWorkflowStepInput) => WorkflowEngineResult<Workflow>;
  completeStep: (
    input: CompleteWorkflowStepInput,
  ) => WorkflowEngineResult<Workflow>;
  addTransition: (input: AddWorkflowTransitionInput) => WorkflowEngineResult<Workflow>;
  updateTransition: (input: UpdateWorkflowTransitionInput) => WorkflowEngineResult<Workflow>;
  removeTransition: (input: RemoveWorkflowTransitionInput) => WorkflowEngineResult<Workflow>;
  registerFailure: (
    input: RegisterWorkflowFailureInput,
  ) => WorkflowEngineResult<Workflow>;
  cancelWorkflow: (
    input: CancelWorkflowInput,
  ) => WorkflowEngineResult<Workflow>;
  getWorkflowState: (
    input: GetWorkflowStateInput,
  ) => WorkflowEngineResult<WorkflowStateSnapshot>;
  validateFormValuesUpdate: (
    workflow: Workflow,
  ) => WorkflowEngineResult<Workflow>;
}>;

export function isTerminalWorkflowStatus(status: WorkflowStatus) {
  return TERMINAL_WORKFLOW_STATUSES.includes(status);
}

export function isWorkflowTransitionAllowed(
  from: WorkflowStatus,
  to: WorkflowStatus,
) {
  return ALLOWED_WORKFLOW_TRANSITIONS.some(
    (transition) => transition.from === from && transition.to === to,
  );
}

export function isCancellationReasonValid(reason: string) {
  return reason.trim().length > 0;
}

export function canChangeWorkflowSteps(workflow: Workflow) {
  return workflow.status === WORKFLOW_STATUSES.draft;
}

export function areWorkflowStepOrdersSequential(
  steps: ReadonlyArray<WorkflowStep>,
) {
  return [...steps]
    .sort((firstStep, secondStep) => firstStep.order - secondStep.order)
    .every((step, index) => step.order === index + 1);
}

export function isWorkflowValid(workflow: Workflow) {
  if (!workflow.id.trim() || !Number.isInteger(workflow.version) || workflow.version < 0 || !workflow.name.trim() || workflow.steps.length === 0) {
    return false;
  }

  const stepIds = new Set<WorkflowStepId>();
  const stepOrders = new Set<number>();

  const hasValidSteps = workflow.steps.every((step) => {
    const hasValidAssignee = Boolean(step.assignee) && (step.assignee.type === "user"
      ? step.assignee.userId.trim().length > 0
      : ["owner", "admin", "editor", "viewer"].includes(step.assignee.role));
    const isStepValid =
      step.id.trim().length > 0 &&
      step.name.trim().length > 0 &&
      Number.isInteger(step.order) &&
      step.order > 0 &&
      !stepIds.has(step.id) &&
      !stepOrders.has(step.order) &&
      hasValidAssignee &&
      step.transitions.length > 0;

    stepIds.add(step.id);
    stepOrders.add(step.order);

    return isStepValid;
  });

  return hasValidSteps && areWorkflowStepOrdersSequential(workflow.steps);
}

export function canExecuteWorkflow(workflow: Workflow) {
  return workflow.status === WORKFLOW_STATUSES.ready && isWorkflowValid(workflow);
}

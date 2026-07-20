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

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  draft: "Rascunho",
  ready: "Pronto",
  running: "Em execução",
  completed: "Concluído",
  failed: "Falhou",
  cancelled: "Cancelado",
};

export const TERMINAL_WORKFLOW_STATUSES: WorkflowStatus[] = [
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

export const WORKFLOW_STEP_STATUS_LABELS: Record<WorkflowStepStatus, string> = {
  pending: "Pendente",
  running: "Em execução",
  completed: "Concluída",
  failed: "Falhou",
  skipped: "Ignorada",
};

export const WORKFLOW_EVENT_TYPES = {
  workflowCreated: "workflow.created",
  workflowPrepared: "workflow.prepared",
  executionStarted: "execution.started",
  stepStarted: "step.started",
  stepCompleted: "step.completed",
  stepFailed: "step.failed",
  workflowCompleted: "workflow.completed",
  workflowFailed: "workflow.failed",
  workflowCancelled: "workflow.cancelled",
  transitionBlocked: "transition.blocked",
} as const;

export type WorkflowEventType =
  (typeof WORKFLOW_EVENT_TYPES)[keyof typeof WORKFLOW_EVENT_TYPES];

export type WorkflowId = string;
export type WorkflowStepId = string;
export type WorkflowExecutionEventId = string;
export type IsoDateString = string;

export type WorkflowExecutionMetadataValue =
  | string
  | number
  | boolean
  | null;

export type WorkflowExecutionMetadata = Record<
  string,
  WorkflowExecutionMetadataValue
>;

export type WorkflowStepExecutionResult = {
  success: boolean;
  message?: string;
  metadata?: WorkflowExecutionMetadata;
};

export type WorkflowStep = {
  id: WorkflowStepId;
  name: string;
  order: number;
  status: WorkflowStepStatus;
  executionResult?: WorkflowStepExecutionResult;
  startedAt?: IsoDateString;
  finishedAt?: IsoDateString;
  errorMessage?: string;
};

export type WorkflowExecutionEvent = {
  id: WorkflowExecutionEventId;
  workflowId: WorkflowId;
  stepId?: WorkflowStepId;
  type: WorkflowEventType;
  timestamp: IsoDateString;
  fromStatus?: WorkflowStatus | WorkflowStepStatus;
  toStatus?: WorkflowStatus | WorkflowStepStatus;
  message: string;
  metadata?: WorkflowExecutionMetadata;
  error?: string;
};

export type Workflow = {
  id: WorkflowId;
  name: string;
  status: WorkflowStatus;
  steps: WorkflowStep[];
  currentStepId?: WorkflowStepId;
  executionHistory: WorkflowExecutionEvent[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  startedAt?: IsoDateString;
  finishedAt?: IsoDateString;
  failureReason?: string;
  cancellationReason?: string;
};

export type CreateWorkflowInput = {
  id?: WorkflowId;
  name: string;
  steps: Array<{
    id?: WorkflowStepId;
    name: string;
    order: number;
  }>;
};

export type PrepareWorkflowInput = {
  workflow: Workflow;
};

export type StartWorkflowExecutionInput = {
  workflow: Workflow;
};

export type StartWorkflowStepInput = {
  workflow: Workflow;
  stepId: WorkflowStepId;
};

export type CompleteWorkflowStepInput = {
  workflow: Workflow;
  stepId: WorkflowStepId;
  result: WorkflowStepExecutionResult;
};

export type RegisterWorkflowFailureInput = {
  workflow: Workflow;
  reason: string;
  stepId?: WorkflowStepId;
};

export type CancelWorkflowInput = {
  workflow: Workflow;
  reason: string;
};

export type GetWorkflowStateInput = {
  workflow: Workflow;
};

export type WorkflowStateSnapshot = {
  workflowId: WorkflowId;
  status: WorkflowStatus;
  currentStep?: WorkflowStep;
  steps: WorkflowStep[];
  executionHistory: WorkflowExecutionEvent[];
};

export type WorkflowEngineErrorCode =
  | "INVALID_WORKFLOW"
  | "INVALID_STEP"
  | "INVALID_TRANSITION"
  | "INVALID_OPERATION"
  | "MISSING_REQUIRED_REASON"
  | "WORKFLOW_ALREADY_FINISHED";

export type WorkflowEngineError = {
  code: WorkflowEngineErrorCode;
  message: string;
  event?: WorkflowExecutionEvent;
};

export type WorkflowEngineResult<T> =
  | {
      success: true;
      data: T;
      events: WorkflowExecutionEvent[];
    }
  | {
      success: false;
      error: WorkflowEngineError;
      events: WorkflowExecutionEvent[];
    };

export type WorkflowEngineService = {
  createWorkflow: (
    input: CreateWorkflowInput,
  ) => WorkflowEngineResult<Workflow>;
  prepareWorkflow: (
    input: PrepareWorkflowInput,
  ) => WorkflowEngineResult<Workflow>;
  startExecution: (
    input: StartWorkflowExecutionInput,
  ) => WorkflowEngineResult<Workflow>;
  startStep: (input: StartWorkflowStepInput) => WorkflowEngineResult<Workflow>;
  completeStep: (
    input: CompleteWorkflowStepInput,
  ) => WorkflowEngineResult<Workflow>;
  registerFailure: (
    input: RegisterWorkflowFailureInput,
  ) => WorkflowEngineResult<Workflow>;
  cancelWorkflow: (
    input: CancelWorkflowInput,
  ) => WorkflowEngineResult<Workflow>;
  getWorkflowState: (
    input: GetWorkflowStateInput,
  ) => WorkflowEngineResult<WorkflowStateSnapshot>;
};

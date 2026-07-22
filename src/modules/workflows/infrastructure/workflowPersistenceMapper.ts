import {
  Prisma,
  WorkflowEventScope,
  WorkflowStatus as PrismaWorkflowStatus,
  WorkflowStepStatus as PrismaWorkflowStepStatus,
} from "@prisma/client";
import type {
  Workflow,
  WorkflowExecutionEvent,
  WorkflowExecutionMetadata,
  WorkflowId,
  WorkflowLifecycleEvent,
  WorkflowStatus,
  WorkflowStep,
  WorkflowStepExecutionEvent,
  WorkflowStepStatus,
} from "@/modules/workflows/domain/workflowEngine";

export const workflowRunInclude = {
  steps: {
    orderBy: {
      order: "asc",
    },
  },
  events: {
    orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
  },
  workflowDefinition: true,
} satisfies Prisma.WorkflowRunInclude;

export const workflowRunListInclude = {
  steps: {
    orderBy: { order: "asc" },
  },
  workflowDefinition: true,
} satisfies Prisma.WorkflowRunInclude;

export type WorkflowRunRecord = Prisma.WorkflowRunGetPayload<{
  include: typeof workflowRunInclude;
}>;

export type WorkflowRunListRecord = Prisma.WorkflowRunGetPayload<{
  include: typeof workflowRunListInclude;
}>;

export function mapWorkflowRunListRecordToDomain(workflowRun: WorkflowRunListRecord): Workflow {
  return {
    id: workflowRun.id,
    name: workflowRun.workflowDefinition.name,
    status: mapWorkflowStatusToDomain(workflowRun.status),
    steps: workflowRun.steps.map(mapWorkflowRunStepToDomain),
    currentStepId: workflowRun.currentStepId ?? undefined,
    executionHistory: [],
    createdAt: workflowRun.createdAt.toISOString(),
    updatedAt: workflowRun.updatedAt.toISOString(),
    startedAt: workflowRun.startedAt?.toISOString(),
    finishedAt: workflowRun.finishedAt?.toISOString(),
    failureReason: workflowRun.failureReason ?? undefined,
    cancellationReason: workflowRun.cancellationReason ?? undefined,
  };
}

export function mapWorkflowRunToDomain(workflowRun: WorkflowRunRecord): Workflow {
  return {
    id: workflowRun.id,
    name: workflowRun.workflowDefinition.name,
    status: mapWorkflowStatusToDomain(workflowRun.status),
    steps: workflowRun.steps.map(mapWorkflowRunStepToDomain),
    currentStepId: workflowRun.currentStepId ?? undefined,
    executionHistory: workflowRun.events.map(mapWorkflowExecutionEventToDomain),
    createdAt: workflowRun.createdAt.toISOString(),
    updatedAt: workflowRun.updatedAt.toISOString(),
    startedAt: workflowRun.startedAt?.toISOString(),
    finishedAt: workflowRun.finishedAt?.toISOString(),
    failureReason: workflowRun.failureReason ?? undefined,
    cancellationReason: workflowRun.cancellationReason ?? undefined,
  };
}

export function mapWorkflowRunStepToDomain(
  step: WorkflowRunRecord["steps"][number] | WorkflowRunListRecord["steps"][number],
): WorkflowStep {
  const executionResult = mapJsonToWorkflowMetadataObject(step.executionResult);

  return {
    id: step.id,
    name: step.name,
    order: step.order,
    status: mapWorkflowStepStatusToDomain(step.status),
    executionResult,
    startedAt: step.startedAt?.toISOString(),
    finishedAt: step.finishedAt?.toISOString(),
    errorMessage: step.errorMessage ?? undefined,
  };
}

export function mapWorkflowExecutionEventToDomain(
  event: WorkflowRunRecord["events"][number],
): WorkflowExecutionEvent {
  const baseEvent = {
    id: event.id,
    workflowId: event.workflowRunId,
    timestamp: event.occurredAt.toISOString(),
    message: event.message,
    metadata: mapJsonToWorkflowMetadataObject(event.metadata),
    error: event.error ?? undefined,
  };

  if (event.eventScope === WorkflowEventScope.WORKFLOW) {
    return {
      ...baseEvent,
      type: event.eventType as WorkflowLifecycleEvent["type"],
      fromStatus: event.fromWorkflowStatus
        ? mapWorkflowStatusToDomain(event.fromWorkflowStatus)
        : undefined,
      toStatus: event.toWorkflowStatus
        ? mapWorkflowStatusToDomain(event.toWorkflowStatus)
        : undefined,
    };
  }

  return {
    ...baseEvent,
    type: event.eventType as WorkflowStepExecutionEvent["type"],
    stepId: event.workflowRunStepId ?? "",
    fromStatus: event.fromStepStatus
      ? mapWorkflowStepStatusToDomain(event.fromStepStatus)
      : undefined,
    toStatus: event.toStepStatus
      ? mapWorkflowStepStatusToDomain(event.toStepStatus)
      : undefined,
  };
}

export function mapWorkflowExecutionEventToPrisma(
  workflowRunId: WorkflowId,
  event: WorkflowExecutionEvent,
) {
  const isStepEvent = "stepId" in event;

  return {
    id: event.id,
    workflowRunId,
    workflowRunStepId: isStepEvent ? event.stepId : undefined,
    eventType: event.type,
    eventScope: isStepEvent ? WorkflowEventScope.STEP : WorkflowEventScope.WORKFLOW,
    fromWorkflowStatus:
      !isStepEvent && event.fromStatus
        ? mapWorkflowStatusToPrisma(event.fromStatus)
        : undefined,
    toWorkflowStatus:
      !isStepEvent && event.toStatus
        ? mapWorkflowStatusToPrisma(event.toStatus)
        : undefined,
    fromStepStatus:
      isStepEvent && event.fromStatus
        ? mapWorkflowStepStatusToPrisma(event.fromStatus)
        : undefined,
    toStepStatus:
      isStepEvent && event.toStatus
        ? mapWorkflowStepStatusToPrisma(event.toStatus)
        : undefined,
    message: event.message,
    metadata: mapJsonToPrismaInput(event.metadata),
    error: event.error,
    occurredAt: mapIsoDateToDate(event.timestamp),
  };
}

export function mapWorkflowStatusToPrisma(status: WorkflowStatus) {
  const workflowStatusMap = {
    draft: PrismaWorkflowStatus.DRAFT,
    ready: PrismaWorkflowStatus.READY,
    running: PrismaWorkflowStatus.RUNNING,
    completed: PrismaWorkflowStatus.COMPLETED,
    failed: PrismaWorkflowStatus.FAILED,
    cancelled: PrismaWorkflowStatus.CANCELLED,
  } satisfies Record<WorkflowStatus, PrismaWorkflowStatus>;

  return workflowStatusMap[status];
}

export function mapWorkflowStatusToDomain(
  status: PrismaWorkflowStatus,
): WorkflowStatus {
  const workflowStatusMap = {
    DRAFT: "draft",
    READY: "ready",
    RUNNING: "running",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELLED: "cancelled",
  } satisfies Record<PrismaWorkflowStatus, WorkflowStatus>;

  return workflowStatusMap[status];
}

export function mapWorkflowStepStatusToPrisma(status: WorkflowStepStatus) {
  const workflowStepStatusMap = {
    pending: PrismaWorkflowStepStatus.PENDING,
    running: PrismaWorkflowStepStatus.RUNNING,
    completed: PrismaWorkflowStepStatus.COMPLETED,
    failed: PrismaWorkflowStepStatus.FAILED,
  } satisfies Record<WorkflowStepStatus, PrismaWorkflowStepStatus>;

  return workflowStepStatusMap[status];
}

export function mapWorkflowStepStatusToDomain(
  status: PrismaWorkflowStepStatus,
): WorkflowStepStatus {
  const workflowStepStatusMap = {
    PENDING: "pending",
    RUNNING: "running",
    COMPLETED: "completed",
    FAILED: "failed",
  } satisfies Record<PrismaWorkflowStepStatus, WorkflowStepStatus>;

  return workflowStepStatusMap[status];
}

export function mapIsoDateToDate(date: string) {
  return new Date(date);
}

export function mapOptionalIsoDateToDate(date?: string) {
  return date ? mapIsoDateToDate(date) : undefined;
}

export function mapJsonToPrismaInput(value: unknown) {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

function mapJsonToWorkflowMetadataObject(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as WorkflowExecutionMetadata;
}

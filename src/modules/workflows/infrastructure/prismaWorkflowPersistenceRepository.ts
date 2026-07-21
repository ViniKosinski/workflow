import {
  Prisma,
  PrismaClient,
  WorkflowEventScope,
  WorkflowStatus as PrismaWorkflowStatus,
  WorkflowStepStatus as PrismaWorkflowStepStatus,
} from "@prisma/client";
import type {
  ListWorkflowsParams,
  WorkflowPersistenceRepository,
} from "@/modules/workflows/domain/workflowPersistenceRepository";
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
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

const workflowRunInclude = {
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

type WorkflowRunRecord = Prisma.WorkflowRunGetPayload<{
  include: typeof workflowRunInclude;
}>;

type PrismaTransaction = Prisma.TransactionClient;

export class PrismaWorkflowPersistenceRepository
  implements WorkflowPersistenceRepository
{
  constructor(private readonly prisma: PrismaClient = prismaClient) {}

  async save(workflow: Workflow) {
    await this.prisma.$transaction(async (transaction) => {
      await this.persistWorkflow(transaction, workflow);
    });

    const persistedWorkflow = await this.findById(workflow.id);

    if (!persistedWorkflow) {
      throw new Error("Workflow was not persisted.");
    }

    return persistedWorkflow;
  }

  async findById(workflowId: WorkflowId) {
    const workflowRun = await this.prisma.workflowRun.findUnique({
      where: {
        id: workflowId,
      },
      include: workflowRunInclude,
    });

    return workflowRun ? mapWorkflowRunToDomain(workflowRun) : null;
  }

  async list(params: ListWorkflowsParams = {}) {
    const workflowRuns = await this.prisma.workflowRun.findMany({
      where: {
        status: params.status
          ? mapWorkflowStatusToPrisma(params.status)
          : undefined,
      },
      include: workflowRunInclude,
      orderBy: {
        createdAt: "desc",
      },
      take: params.limit,
      skip: params.offset,
    });

    return workflowRuns.map(mapWorkflowRunToDomain);
  }

  async update(workflow: Workflow) {
    await this.prisma.$transaction(async (transaction) => {
      await transaction.workflowRun.update({
        where: {
          id: workflow.id,
        },
        data: {
          currentStepId: null,
        },
      });

      await transaction.workflowExecutionEvent.deleteMany({
        where: {
          workflowRunId: workflow.id,
        },
      });

      await transaction.workflowRunStep.deleteMany({
        where: {
          workflowRunId: workflow.id,
        },
      });

      await transaction.workflowDefinitionStep.deleteMany({
        where: {
          workflowDefinitionId: workflow.id,
        },
      });

      await this.persistWorkflow(transaction, workflow);
    });

    const persistedWorkflow = await this.findById(workflow.id);

    if (!persistedWorkflow) {
      throw new Error("Workflow was not found after update.");
    }

    return persistedWorkflow;
  }

  async exists(workflowId: WorkflowId) {
    const workflowRun = await this.prisma.workflowRun.findUnique({
      where: {
        id: workflowId,
      },
      select: {
        id: true,
      },
    });

    return Boolean(workflowRun);
  }

  private async persistWorkflow(
    transaction: PrismaTransaction,
    workflow: Workflow,
  ) {
    await transaction.workflowDefinition.upsert({
      where: {
        id: workflow.id,
      },
      create: {
        id: workflow.id,
        name: workflow.name,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      },
      update: {
        name: workflow.name,
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      },
    });

    await transaction.workflowDefinitionStep.createMany({
      data: workflow.steps.map((step) => ({
        id: step.id,
        workflowDefinitionId: workflow.id,
        name: step.name,
        order: step.order,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      })),
    });

    await transaction.workflowRun.upsert({
      where: {
        id: workflow.id,
      },
      create: {
        id: workflow.id,
        workflowDefinitionId: workflow.id,
        status: mapWorkflowStatusToPrisma(workflow.status),
        currentStepId: null,
        startedAt: mapOptionalIsoDateToDate(workflow.startedAt),
        finishedAt: mapOptionalIsoDateToDate(workflow.finishedAt),
        failureReason: workflow.failureReason,
        cancellationReason: workflow.cancellationReason,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      },
      update: {
        workflowDefinitionId: workflow.id,
        status: mapWorkflowStatusToPrisma(workflow.status),
        currentStepId: null,
        startedAt: mapOptionalIsoDateToDate(workflow.startedAt),
        finishedAt: mapOptionalIsoDateToDate(workflow.finishedAt),
        failureReason: workflow.failureReason,
        cancellationReason: workflow.cancellationReason,
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      },
    });

    await transaction.workflowRunStep.createMany({
      data: workflow.steps.map((step) => ({
        id: step.id,
        workflowRunId: workflow.id,
        workflowDefinitionStepId: step.id,
        name: step.name,
        order: step.order,
        status: mapWorkflowStepStatusToPrisma(step.status),
        executionResult: mapJsonToPrismaInput(step.executionResult),
        startedAt: mapOptionalIsoDateToDate(step.startedAt),
        finishedAt: mapOptionalIsoDateToDate(step.finishedAt),
        errorMessage: step.errorMessage,
        createdAt: mapIsoDateToDate(workflow.createdAt),
        updatedAt: mapIsoDateToDate(workflow.updatedAt),
      })),
    });

    await transaction.workflowRun.update({
      where: {
        id: workflow.id,
      },
      data: {
        currentStepId: workflow.currentStepId,
      },
    });

    await transaction.workflowExecutionEvent.createMany({
      data: workflow.executionHistory.map((event) =>
        mapWorkflowExecutionEventToPrisma(workflow.id, event),
      ),
    });
  }
}

export const prismaWorkflowPersistenceRepository =
  new PrismaWorkflowPersistenceRepository();

function mapWorkflowRunToDomain(workflowRun: WorkflowRunRecord): Workflow {
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

function mapWorkflowRunStepToDomain(
  step: WorkflowRunRecord["steps"][number],
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

function mapWorkflowExecutionEventToDomain(
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

function mapWorkflowExecutionEventToPrisma(
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

function mapWorkflowStatusToPrisma(status: WorkflowStatus) {
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

function mapWorkflowStatusToDomain(status: PrismaWorkflowStatus): WorkflowStatus {
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

function mapWorkflowStepStatusToPrisma(status: WorkflowStepStatus) {
  const workflowStepStatusMap = {
    pending: PrismaWorkflowStepStatus.PENDING,
    running: PrismaWorkflowStepStatus.RUNNING,
    completed: PrismaWorkflowStepStatus.COMPLETED,
    failed: PrismaWorkflowStepStatus.FAILED,
  } satisfies Record<WorkflowStepStatus, PrismaWorkflowStepStatus>;

  return workflowStepStatusMap[status];
}

function mapWorkflowStepStatusToDomain(
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

function mapIsoDateToDate(date: string) {
  return new Date(date);
}

function mapOptionalIsoDateToDate(date?: string) {
  return date ? mapIsoDateToDate(date) : undefined;
}

function mapJsonToPrismaInput(value: unknown) {
  return value === undefined ? undefined : (value as Prisma.InputJsonValue);
}

function mapJsonToWorkflowMetadataObject(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  return value as WorkflowExecutionMetadata;
}

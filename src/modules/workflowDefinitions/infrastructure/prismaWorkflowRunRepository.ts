import { Prisma, type PrismaClient } from "@prisma/client";
import type { WorkflowDefinition } from "@/modules/workflowDefinitions/domain/workflowDefinition";
import type { WorkflowRunRepository } from "@/modules/workflowDefinitions/domain/workflowRunRepository";
import type { Workflow, WorkflowStatus, WorkflowStep } from "@/modules/workflows/domain/workflowEngine";
import type { WorkflowPersistenceRepository } from "@/modules/workflows/domain/workflowPersistenceRepository";
import { WorkflowConcurrencyError } from "@/modules/workflows/domain/workflowPersistenceRepository";
import { WorkflowDefinitionError } from "@/modules/workflowDefinitions/domain/workflowDefinition";
import {
  mapJsonToPrismaInput,
  mapWorkflowExecutionEventToPrisma,
  mapWorkflowStatusToDomain,
  mapWorkflowStatusToPrisma,
  mapWorkflowStepStatusToDomain,
  mapWorkflowStepStatusToPrisma,
} from "@/modules/workflows/infrastructure/workflowPersistenceMapper";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";
import {
  lockWorkflowDefinition,
  serializableWorkflowDefinitionTransaction,
} from "@/modules/workflowDefinitions/infrastructure/workflowDefinitionTransaction";

const include = {
  workflowDefinition: { include: { steps: { include: { outgoingTransitions: true }, orderBy: { order: "asc" as const } } } },
  steps: { orderBy: { order: "asc" as const } },
  events: { orderBy: [{ occurredAt: "asc" as const }, { createdAt: "asc" as const }] },
} satisfies Prisma.WorkflowRunInclude;

type RunRecord = Prisma.WorkflowRunGetPayload<{ include: typeof include }>;
type Db = PrismaClient | Prisma.TransactionClient;

function mapRun(record: RunRecord): Workflow {
  const runIdByDefinitionStep = new Map(
    record.steps.flatMap((step) => step.workflowDefinitionStepId ? [[step.workflowDefinitionStepId, step.id] as const] : []),
  );
  const definitionSteps = new Map(record.workflowDefinition.steps.map((step) => [step.id, step]));
  const steps: WorkflowStep[] = record.steps.map((step) => {
    const definitionStep = step.workflowDefinitionStepId ? definitionSteps.get(step.workflowDefinitionStepId) : undefined;
    return {
      id: step.id,
      name: step.name,
      order: step.order,
      status: mapWorkflowStepStatusToDomain(step.status),
      executionResult: step.executionResult as WorkflowStep["executionResult"],
      startedAt: step.startedAt?.toISOString(),
      finishedAt: step.finishedAt?.toISOString(),
      errorMessage: step.errorMessage ?? undefined,
      assignee: step.assigneeType === "USER"
        ? { type: "user", userId: step.assigneeUserId ?? "" }
        : { type: "role", role: step.assigneeRole!.toLowerCase() as "owner" | "admin" | "editor" | "viewer" },
      priority: "normal",
      transitions: (definitionStep?.outgoingTransitions ?? []).map((transition) => ({
        id: transition.id,
        name: transition.name,
        description: transition.description ?? undefined,
        result: transition.result,
        targetStepId: transition.targetStepId ? runIdByDefinitionStep.get(transition.targetStepId) : undefined,
        endsWorkflow: transition.endsWorkflow,
      })),
    };
  });
  return {
    id: record.id,
    definitionId: record.workflowDefinition.id,
    definitionRevision: record.workflowDefinition.revisionNumber,
    version: record.version,
    name: record.workflowDefinition.name,
    status: mapWorkflowStatusToDomain(record.status),
    steps,
    currentStepId: record.currentStepId ?? undefined,
    executionHistory: record.events.map((event) => ({
      id: event.id,
      workflowId: record.id,
      timestamp: event.occurredAt.toISOString(),
      message: event.message,
      metadata: event.metadata as Record<string, string | number | boolean | null> | undefined,
      error: event.error ?? undefined,
      type: event.eventType,
      ...(
        event.eventScope === "STEP"
          ? {
              stepId: event.workflowRunStepId ?? "",
              fromStatus: event.fromStepStatus ? mapWorkflowStepStatusToDomain(event.fromStepStatus) : undefined,
              toStatus: event.toStepStatus ? mapWorkflowStepStatusToDomain(event.toStepStatus) : undefined,
            }
          : {
              fromStatus: event.fromWorkflowStatus ? mapWorkflowStatusToDomain(event.fromWorkflowStatus) : undefined,
              toStatus: event.toWorkflowStatus ? mapWorkflowStatusToDomain(event.toWorkflowStatus) : undefined,
            }
      ),
    })) as Workflow["executionHistory"],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    startedAt: record.startedAt?.toISOString(),
    finishedAt: record.finishedAt?.toISOString(),
    failureReason: record.failureReason ?? undefined,
    cancellationReason: record.cancellationReason ?? undefined,
  };
}

export class PrismaWorkflowRunRepository implements WorkflowRunRepository, WorkflowPersistenceRepository {
  constructor(
    private readonly organizationId: string,
    private readonly prisma: Db = prismaClient,
  ) {}

  async create(definition: WorkflowDefinition, run: Workflow, startedByUserId: string) {
    const definitionStepByOrder = new Map(definition.steps.map((step) => [step.order, step.id]));
    await this.definitionTransaction(definition.definitionKey, async (transaction) => {
      const published = await transaction.workflowDefinition.findFirst({
        where: { id: definition.id, organizationId: this.organizationId, status: "PUBLISHED" },
        select: { id: true },
      });
      if (!published) throw new WorkflowDefinitionError("A revisão não está mais publicada.");
      await transaction.workflowRun.create({
        data: {
          id: run.id,
          workflowDefinitionId: definition.id,
          status: mapWorkflowStatusToPrisma(run.status),
          version: 1,
          startedByUserId,
          startedAt: run.startedAt ? new Date(run.startedAt) : null,
          finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
          createdAt: new Date(run.createdAt),
          updatedAt: new Date(run.updatedAt),
        },
      });
      await transaction.workflowRunStep.createMany({
        data: run.steps.map((step) => ({
          id: step.id,
          workflowRunId: run.id,
          workflowDefinitionStepId: definitionStepByOrder.get(step.order),
          name: step.name,
          order: step.order,
          status: mapWorkflowStepStatusToPrisma(step.status),
          assigneeType: step.assignee.type === "user" ? "USER" : "ROLE",
          assigneeUserId: step.assignee.type === "user" ? step.assignee.userId : null,
          assigneeRole: step.assignee.type === "role" ? step.assignee.role.toUpperCase() as "OWNER" | "ADMIN" | "EDITOR" | "VIEWER" : null,
          priority: "NORMAL",
        })),
      });
      await transaction.workflowRun.update({ where: { id: run.id }, data: { currentStepId: run.currentStepId } });
      await transaction.workflowExecutionEvent.createMany({
        data: run.executionHistory.map((event) => mapWorkflowExecutionEventToPrisma(run.id, event)),
      });
    });
    return (await this.findById(run.id))!;
  }

  async save(workflow: Workflow): Promise<Workflow> {
    void workflow;
    throw new Error("Execuções devem ser criadas a partir de uma definição publicada.");
  }

  async update(workflow: Workflow) {
    await this.transaction(async (transaction) => {
      const updated = await transaction.workflowRun.updateMany({
        where: {
          id: workflow.id,
          version: workflow.version,
          workflowDefinition: { organizationId: this.organizationId },
        },
        data: {
          status: mapWorkflowStatusToPrisma(workflow.status),
          version: { increment: 1 },
          startedAt: workflow.startedAt ? new Date(workflow.startedAt) : null,
          finishedAt: workflow.finishedAt ? new Date(workflow.finishedAt) : null,
          failureReason: workflow.failureReason,
          cancellationReason: workflow.cancellationReason,
          currentStepId: null,
          updatedAt: new Date(workflow.updatedAt),
        },
      });
      if (updated.count !== 1) {
        const owned = await transaction.workflowRun.findFirst({
          where: {
            id: workflow.id,
            workflowDefinition: { organizationId: this.organizationId },
          },
          select: { id: true },
        });
        if (!owned) throw new Error("Workflow was not found.");
        throw new WorkflowConcurrencyError(workflow.id);
      }
      for (const step of workflow.steps) {
        await transaction.workflowRunStep.update({
          where: { id: step.id },
          data: {
            status: mapWorkflowStepStatusToPrisma(step.status),
            executionResult: mapJsonToPrismaInput(step.executionResult),
            startedAt: step.startedAt ? new Date(step.startedAt) : null,
            finishedAt: step.finishedAt ? new Date(step.finishedAt) : null,
            errorMessage: step.errorMessage,
          },
        });
      }
      await transaction.workflowRun.update({ where: { id: workflow.id }, data: { currentStepId: workflow.currentStepId } });
      await transaction.workflowExecutionEvent.createMany({
        data: workflow.executionHistory.map((event) => mapWorkflowExecutionEventToPrisma(workflow.id, event)),
        skipDuplicates: true,
      });
    });
    return (await this.findById(workflow.id))!;
  }

  async findById(id: string) {
    const record = await this.prisma.workflowRun.findFirst({
      where: { id, workflowDefinition: { organizationId: this.organizationId } },
      include,
    });
    return record ? mapRun(record) : null;
  }

  async list(input: Readonly<{ definitionId?: string; status?: WorkflowStatus; limit?: number; offset?: number }> = {}) {
    const records = await this.prisma.workflowRun.findMany({
      where: {
        workflowDefinitionId: input.definitionId,
        workflowDefinition: { organizationId: this.organizationId },
        status: input.status ? mapWorkflowStatusToPrisma(input.status) : undefined,
      },
      include,
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(input.limit ?? 50, 1), 100),
      skip: Math.max(input.offset ?? 0, 0),
    });
    return records.map(mapRun);
  }

  async exists(id: string) {
    return Boolean(await this.prisma.workflowRun.findFirst({
      where: { id, workflowDefinition: { organizationId: this.organizationId } },
      select: { id: true },
    }));
  }

  private transaction<T>(work: (transaction: Prisma.TransactionClient) => Promise<T>) {
    if ("$transaction" in this.prisma) return (this.prisma as PrismaClient).$transaction(work);
    return work(this.prisma as Prisma.TransactionClient);
  }

  private definitionTransaction<T>(
    definitionKey: string,
    work: (transaction: Prisma.TransactionClient) => Promise<T>,
  ) {
    if (!("$transaction" in this.prisma)) {
      return work(this.prisma as Prisma.TransactionClient);
    }
    return serializableWorkflowDefinitionTransaction(this.prisma as PrismaClient, async (transaction) => {
      await lockWorkflowDefinition(transaction, this.organizationId, definitionKey);
      return work(transaction);
    });
  }
}

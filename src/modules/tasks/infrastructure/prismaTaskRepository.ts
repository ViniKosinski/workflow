import type { Prisma, PrismaClient } from "@prisma/client";
import type { OrganizationRole } from "@/modules/organizations/domain/membership";
import type { OrganizationTaskListQuery, TaskHistoryEntry, TaskListQuery, WorkTask } from "@/modules/tasks/domain/task";
import type { OrganizationTaskRepository, TaskAccess, TaskRepository } from "@/modules/tasks/domain/taskRepository";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

const roleFromPrisma = (role: string) => role.toLowerCase() as OrganizationRole;

const taskInclude = {
  assigneeUser: { select: { name: true } },
  workflowRun: {
    include: {
      workflowDefinition: { include: { organization: { select: { id: true, name: true } } } },
    },
  },
  workflowDefinitionStep: { include: { outgoingTransitions: { orderBy: { createdAt: "asc" } } } },
} satisfies Prisma.WorkflowRunStepInclude;

type TaskRecord = Prisma.WorkflowRunStepGetPayload<{ include: typeof taskInclude }>;

function mapTask(record: TaskRecord): WorkTask {
  const role = record.assigneeRole ? roleFromPrisma(record.assigneeRole) : "viewer";
  return {
    id: record.id,
    workflowId: record.workflowRunId,
    workflowName: record.workflowRun.workflowDefinition.name,
    organizationId: record.workflowRun.workflowDefinition.organization.id,
    organizationName: record.workflowRun.workflowDefinition.organization.name,
    stepName: record.name,
    assignee: record.assigneeType === "ROLE"
      ? { type: "role", role }
      : { type: "user", userId: record.assigneeUserId ?? "" },
    assigneeName: record.assigneeType === "ROLE" ? `Papel ${role}` : (record.assigneeUser?.name ?? "Usuário"),
    priority: "normal",
    createdAt: record.updatedAt.toISOString(),
    status: record.status.toLowerCase() as WorkTask["status"],
    outcomes: (record.workflowDefinitionStep?.outgoingTransitions ?? []).map((transition) => ({ result: transition.result, name: transition.name, description: transition.description ?? undefined })),
  };
}

export class PrismaTaskRepository implements TaskRepository, OrganizationTaskRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient = prismaClient) {}

  async listMine(userId: string, query: TaskListQuery) {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId },
      select: { organizationId: true, role: true },
    });
    if (memberships.length === 0) return { tasks: [], page: query.page, pageSize: query.pageSize, total: 0, totalPages: 0 };
    const assignmentFilters: Prisma.WorkflowRunStepWhereInput[] = [
      {
        assigneeType: "USER",
        assigneeUserId: userId,
        workflowRun: { workflowDefinition: { organizationId: { in: memberships.map((membership) => membership.organizationId) } } },
      },
      ...memberships.map((membership) => ({
        assigneeType: "ROLE" as const,
        assigneeRole: membership.role,
        workflowRun: { workflowDefinition: { organizationId: membership.organizationId } },
      })),
    ];
    const where: Prisma.WorkflowRunStepWhereInput = {
        currentForRun: { is: { status: "RUNNING" } },
        status: query.status ? query.status.toUpperCase() as "PENDING" | "RUNNING" : { in: ["PENDING", "RUNNING"] },
        OR: assignmentFilters,
        ...(query.organizationId ? { workflowRun: { workflowDefinition: { organizationId: query.organizationId } } } : {}),
        ...(query.search ? { AND: [{ OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { workflowRun: { workflowDefinition: { name: { contains: query.search, mode: "insensitive" } } } },
        ] }] } : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.workflowRunStep.findMany({
      where,
      include: taskInclude,
      orderBy: { createdAt: query.order },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
      this.prisma.workflowRunStep.count({ where }),
    ]);
    return { tasks: records.map(mapTask), page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async listOrganization(organizationId: string, query: OrganizationTaskListQuery) {
    const where: Prisma.WorkflowRunStepWhereInput = {
      workflowRun: { workflowDefinition: { organizationId } },
      status: query.status ? query.status.toUpperCase() as "PENDING" | "RUNNING" | "COMPLETED" : { in: ["PENDING", "RUNNING", "COMPLETED"] },
      ...(query.assigneeUserId ? { assigneeType: "USER", assigneeUserId: query.assigneeUserId } : {}),
      ...(query.search ? { AND: [{ OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { assigneeUser: { name: { contains: query.search, mode: "insensitive" } } },
        { workflowRun: { workflowDefinition: { name: { contains: query.search, mode: "insensitive" } } } },
      ] }] } : {}),
    };
    const [records, total] = await Promise.all([
      this.prisma.workflowRunStep.findMany({ where, include: taskInclude, orderBy: { updatedAt: query.order }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.workflowRunStep.count({ where }),
    ]);
    return { tasks: records.map(mapTask), page: query.page, pageSize: query.pageSize, total, totalPages: Math.ceil(total / query.pageSize) };
  }

  async findInOrganization(taskId: string, organizationId: string) {
    const record = await this.prisma.workflowRunStep.findFirst({
      where: { id: taskId, workflowRun: { workflowDefinition: { organizationId } } },
      include: taskInclude,
    });
    return record ? mapTask(record) : null;
  }

  async findMine(taskId: string, userId: string): Promise<TaskAccess | null> {
    const record = await this.prisma.workflowRunStep.findFirst({
      where: { id: taskId, currentForRun: { is: { status: "RUNNING" } }, status: { in: ["PENDING", "RUNNING"] } },
      include: taskInclude,
    });
    if (!record) return null;
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: record.workflowRun.workflowDefinition.organizationId, userId } },
      select: { role: true },
    });
    if (!membership) return null;
    return { task: mapTask(record), actorRole: roleFromPrisma(membership.role) };
  }

  async findForHistory(taskId: string, userId: string): Promise<TaskAccess | null> {
    const record = await this.prisma.workflowRunStep.findUnique({ where: { id: taskId }, include: taskInclude });
    if (!record) return null;
    const membership = await this.prisma.organizationMembership.findUnique({ where: { organizationId_userId: { organizationId: record.workflowRun.workflowDefinition.organizationId, userId } }, select: { role: true } });
    if (!membership) return null;
    return { task: mapTask(record), actorRole: roleFromPrisma(membership.role) };
  }

  async listHistory(taskId: string): Promise<ReadonlyArray<TaskHistoryEntry>> {
    const events = await this.prisma.workflowExecutionEvent.findMany({
      where: { workflowRunStepId: taskId },
      orderBy: { occurredAt: "asc" },
    });
    const executorIds = events.flatMap((event) => {
      const metadata = event.metadata as Record<string, unknown> | null;
      return typeof metadata?.executorUserId === "string" ? [metadata.executorUserId] : [];
    });
    const executors = await this.prisma.user.findMany({ where: { id: { in: executorIds } }, select: { id: true, name: true } });
    const names = new Map(executors.map((user) => [user.id, user.name]));
    return events.map((event) => {
      const metadata = event.metadata as Record<string, unknown> | null;
      const executorUserId = typeof metadata?.executorUserId === "string" ? metadata.executorUserId : undefined;
      return {
        id: event.id,
        type: event.eventType,
        occurredAt: event.occurredAt.toISOString(),
        executorUserId,
        executorName: executorUserId ? names.get(executorUserId) : undefined,
        transition: typeof metadata?.transition === "string" ? metadata.transition : undefined,
        selectedResult: typeof metadata?.selectedResult === "string" ? metadata.selectedResult : undefined,
        sourceStepId: typeof metadata?.sourceStepId === "string" ? metadata.sourceStepId : undefined,
        targetStepId: typeof metadata?.targetStepId === "string" ? metadata.targetStepId : undefined,
        observation: typeof metadata?.observation === "string" ? metadata.observation : undefined,
        workflowEnded: typeof metadata?.workflowEnded === "boolean" ? metadata.workflowEnded : undefined,
        message: event.message,
      };
    });
  }
}

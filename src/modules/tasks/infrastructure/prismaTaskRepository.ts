import type { Prisma } from "@prisma/client";
import type { OrganizationRole } from "@/modules/organizations/domain/membership";
import type { TaskHistoryEntry, WorkTask } from "@/modules/tasks/domain/task";
import type { TaskAccess, TaskRepository } from "@/modules/tasks/domain/taskRepository";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

const roleFromPrisma = (role: string) => role.toLowerCase() as OrganizationRole;

const taskInclude = {
  assigneeUser: { select: { name: true } },
  workflowRun: {
    include: {
      workflowDefinition: { include: { organization: { select: { id: true, name: true } } } },
    },
  },
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
    status: record.status.toLowerCase() as "pending" | "running",
  };
}

export class PrismaTaskRepository implements TaskRepository {
  async listMine(userId: string, order: "asc" | "desc") {
    const memberships = await prismaClient.organizationMembership.findMany({
      where: { userId },
      select: { organizationId: true, role: true },
    });
    if (memberships.length === 0) return [];
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
    const records = await prismaClient.workflowRunStep.findMany({
      where: {
        currentForRun: { is: { status: "RUNNING" } },
        status: { in: ["PENDING", "RUNNING"] },
        OR: assignmentFilters,
      },
      include: taskInclude,
      orderBy: { createdAt: order },
    });
    return records.map(mapTask);
  }

  async findMine(taskId: string, userId: string): Promise<TaskAccess | null> {
    const record = await prismaClient.workflowRunStep.findFirst({
      where: { id: taskId, currentForRun: { is: { status: "RUNNING" } }, status: { in: ["PENDING", "RUNNING"] } },
      include: taskInclude,
    });
    if (!record) return null;
    const membership = await prismaClient.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: record.workflowRun.workflowDefinition.organizationId, userId } },
      select: { role: true },
    });
    if (!membership) return null;
    return { task: mapTask(record), actorRole: roleFromPrisma(membership.role) };
  }

  async listHistory(taskId: string, userId: string): Promise<ReadonlyArray<TaskHistoryEntry> | null> {
    if (!await this.findMine(taskId, userId)) return null;
    const events = await prismaClient.workflowExecutionEvent.findMany({
      where: { workflowRunStepId: taskId },
      orderBy: { occurredAt: "asc" },
    });
    const executorIds = events.flatMap((event) => {
      const metadata = event.metadata as Record<string, unknown> | null;
      return typeof metadata?.executorUserId === "string" ? [metadata.executorUserId] : [];
    });
    const executors = await prismaClient.user.findMany({ where: { id: { in: executorIds } }, select: { id: true, name: true } });
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
        message: event.message,
      };
    });
  }
}

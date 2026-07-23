import type { Prisma } from "@prisma/client";
import type { DashboardMetricsRepository } from "@/modules/dashboard/application/dashboardMetrics";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

export class PrismaDashboardMetricsRepository implements DashboardMetricsRepository {
  async get(userId: string, organizationId: string, startOfDay: Date) {
    const memberships = await prismaClient.organizationMembership.findMany({ where: { userId }, select: { organizationId: true, role: true } });
    const assignment: Prisma.WorkflowRunStepWhereInput[] = [
      { assigneeType: "USER", assigneeUserId: userId, workflowRun: { workflowDefinition: { organizationId: { in: memberships.map((item) => item.organizationId) } } } },
      ...memberships.map((item) => ({ assigneeType: "ROLE" as const, assigneeRole: item.role, workflowRun: { workflowDefinition: { organizationId: item.organizationId } } })),
    ];
    const [activeWorkflows, closedWorkflows, pendingTasks, completedTasksToday] = await Promise.all([
      prismaClient.workflowRun.count({ where: { workflowDefinition: { organizationId }, status: "RUNNING" } }),
      prismaClient.workflowRun.count({ where: { workflowDefinition: { organizationId }, status: { in: ["COMPLETED", "FAILED", "CANCELLED"] } } }),
      prismaClient.workflowRunStep.count({ where: { currentForRun: { is: { status: "RUNNING" } }, status: { in: ["PENDING", "RUNNING"] }, OR: assignment } }),
      prismaClient.workflowRunStep.count({ where: { status: "COMPLETED", finishedAt: { gte: startOfDay }, OR: assignment } }),
    ]);
    return { activeWorkflows, closedWorkflows, pendingTasks, completedTasksToday };
  }
}

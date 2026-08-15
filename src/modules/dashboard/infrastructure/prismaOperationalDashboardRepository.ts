import type { Prisma } from "@prisma/client";
import type { OperationalDashboardRepository } from "@/modules/dashboard/application/operationalDashboard";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

const organizationWhere = (organizationId: string): Prisma.WorkflowRunStepWhereInput => ({
  workflowRun: { workflowDefinition: { organizationId } },
});

export class PrismaOperationalDashboardRepository implements OperationalDashboardRepository {
  async getOrganization(organizationId: string) {
    const activeTaskWhere: Prisma.WorkflowRunStepWhereInput = {
      ...organizationWhere(organizationId),
      currentForRun: { is: { status: "RUNNING" } },
    };
    const [pendingTasks, runningTasks, activeRuns, completedRuns, statusGroups, runGroups, oldestRecords] = await Promise.all([
      prismaClient.workflowRunStep.count({ where: { ...activeTaskWhere, status: "PENDING" } }),
      prismaClient.workflowRunStep.count({ where: { ...activeTaskWhere, status: "RUNNING" } }),
      prismaClient.workflowRun.count({ where: { workflowDefinition: { organizationId }, status: "RUNNING" } }),
      prismaClient.workflowRun.count({ where: { workflowDefinition: { organizationId }, status: "COMPLETED" } }),
      prismaClient.workflowRunStep.groupBy({ by: ["status"], where: { ...organizationWhere(organizationId), status: { in: ["PENDING", "RUNNING", "COMPLETED"] } }, _count: { _all: true } }),
      prismaClient.workflowRun.groupBy({ by: ["workflowDefinitionId", "status"], where: { workflowDefinition: { organizationId }, status: { in: ["RUNNING", "COMPLETED", "FAILED", "CANCELLED"] } }, _count: { _all: true } }),
      prismaClient.workflowRunStep.findMany({
        where: { ...activeTaskWhere, status: { in: ["PENDING", "RUNNING"] } },
        orderBy: { updatedAt: "asc" },
        take: 5,
        select: { id: true, name: true, status: true, updatedAt: true, assigneeType: true, assigneeRole: true, assigneeUser: { select: { name: true } }, workflowRun: { select: { workflowDefinition: { select: { name: true } } } } },
      }),
    ]);
    const definitionIds = [...new Set(runGroups.map((group) => group.workflowDefinitionId))];
    const definitions = await prismaClient.workflowDefinition.findMany({ where: { id: { in: definitionIds }, organizationId }, select: { id: true, name: true } });
    const definitionNames = new Map(definitions.map((definition) => [definition.id, definition.name]));
    const workflows = new Map<string, { workflowDefinitionId: string; workflowName: string; total: number; active: number; completed: number }>();
    for (const group of runGroups) {
      const current = workflows.get(group.workflowDefinitionId) ?? { workflowDefinitionId: group.workflowDefinitionId, workflowName: definitionNames.get(group.workflowDefinitionId) ?? "Workflow", total: 0, active: 0, completed: 0 };
      current.total += group._count._all;
      if (group.status === "RUNNING") current.active += group._count._all;
      if (group.status === "COMPLETED") current.completed += group._count._all;
      workflows.set(group.workflowDefinitionId, current);
    }
    const countByStatus = new Map(statusGroups.map((group) => [group.status.toLowerCase(), group._count._all]));
    return {
      organizationId,
      pendingTasks,
      runningTasks,
      activeRuns,
      completedRuns,
      tasksByStatus: (["pending", "running", "completed"] as const).map((status) => ({ status, count: countByStatus.get(status) ?? 0 })),
      runsByWorkflow: [...workflows.values()].sort((left, right) => right.total - left.total).slice(0, 5),
      oldestTasks: oldestRecords.map((task) => ({ id: task.id, name: task.name, workflowName: task.workflowRun.workflowDefinition.name, assigneeName: task.assigneeType === "ROLE" ? `Papel ${task.assigneeRole?.toLowerCase() ?? ""}` : task.assigneeUser?.name ?? "Usuário", status: task.status.toLowerCase() as "pending" | "running", updatedAt: task.updatedAt.toISOString() })),
    };
  }
}

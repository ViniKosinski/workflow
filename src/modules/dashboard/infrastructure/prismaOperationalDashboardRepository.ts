import type { Prisma } from "@prisma/client";
import type { DashboardPeriod, OperationalDashboardRepository } from "@/modules/dashboard/application/operationalDashboard";
import { prismaClient } from "@/shared/infrastructure/database/prismaClient";

const organizationWhere = (organizationId: string): Prisma.WorkflowRunStepWhereInput => ({
  workflowRun: { workflowDefinition: { organizationId } },
});

export class PrismaOperationalDashboardRepository implements OperationalDashboardRepository {
  async getOrganization(organizationId: string, periodDays: DashboardPeriod, periodStart: Date, now: Date) {
    const activeTaskWhere: Prisma.WorkflowRunStepWhereInput = {
      ...organizationWhere(organizationId),
      currentForRun: { is: { status: "RUNNING" } },
    };
    const [pendingTasks, runningTasks, activeRuns, completedRuns, statusGroups, runGroups, oldestRecords, temporalRuns, completedSteps] = await Promise.all([
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
      prismaClient.workflowRun.findMany({ where: { workflowDefinition: { organizationId }, OR: [{ startedAt: { gte: periodStart, lte: now } }, { finishedAt: { gte: periodStart, lte: now } }] }, select: { status: true, startedAt: true, finishedAt: true } }),
      prismaClient.workflowRunStep.findMany({ where: { ...organizationWhere(organizationId), status: "COMPLETED", startedAt: { not: null }, finishedAt: { gte: periodStart, lte: now } }, select: { startedAt: true, finishedAt: true } }),
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
    const dateKey = (date: Date) => date.toISOString().slice(0, 10);
    const daily = new Map<string, { date: string; started: number; completed: number }>();
    for (let index = 0; index < periodDays; index += 1) {
      const date = new Date(periodStart); date.setUTCDate(date.getUTCDate() + index);
      const key = dateKey(date); daily.set(key, { date: key, started: 0, completed: 0 });
    }
    for (const run of temporalRuns) {
      if (run.startedAt && run.startedAt >= periodStart && run.startedAt <= now) daily.get(dateKey(run.startedAt))!.started += 1;
      if (run.status === "COMPLETED" && run.finishedAt && run.finishedAt >= periodStart && run.finishedAt <= now) daily.get(dateKey(run.finishedAt))!.completed += 1;
    }
    const completedInPeriod = temporalRuns.filter((run) => run.status === "COMPLETED" && run.finishedAt && run.finishedAt >= periodStart && run.finishedAt <= now);
    const durationHours = (startedAt: Date | null, finishedAt: Date | null) => startedAt && finishedAt ? (finishedAt.getTime() - startedAt.getTime()) / 3_600_000 : null;
    const average = (values: ReadonlyArray<number>) => values.length === 0 ? null : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 10) / 10;
    return {
      organizationId,
      periodDays,
      pendingTasks,
      runningTasks,
      activeRuns,
      completedRuns,
      startedRunsInPeriod: temporalRuns.filter((run) => run.startedAt && run.startedAt >= periodStart && run.startedAt <= now).length,
      completedRunsInPeriod: completedInPeriod.length,
      averageCompletionHours: average(completedInPeriod.flatMap((run) => { const value = durationHours(run.startedAt, run.finishedAt); return value === null ? [] : [value]; })),
      averageStepHours: average(completedSteps.flatMap((step) => { const value = durationHours(step.startedAt, step.finishedAt); return value === null ? [] : [value]; })),
      dailyThroughput: [...daily.values()],
      tasksByStatus: (["pending", "running", "completed"] as const).map((status) => ({ status, count: countByStatus.get(status) ?? 0 })),
      runsByWorkflow: [...workflows.values()].sort((left, right) => right.total - left.total).slice(0, 5),
      oldestTasks: oldestRecords.map((task) => ({ id: task.id, name: task.name, workflowName: task.workflowRun.workflowDefinition.name, assigneeName: task.assigneeType === "ROLE" ? `Papel ${task.assigneeRole?.toLowerCase() ?? ""}` : task.assigneeUser?.name ?? "Usuário", status: task.status.toLowerCase() as "pending" | "running", updatedAt: task.updatedAt.toISOString() })),
    };
  }
}

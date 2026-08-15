import { ORGANIZATION_PERMISSIONS, type OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";
import type { MembershipRepository } from "@/modules/organizations/domain/membershipRepository";

export type OperationalDashboard = Readonly<{
  organizationId: string;
  periodDays: DashboardPeriod;
  pendingTasks: number;
  runningTasks: number;
  activeRuns: number;
  completedRuns: number;
  startedRunsInPeriod: number;
  completedRunsInPeriod: number;
  averageCompletionHours: number | null;
  averageStepHours: number | null;
  dailyThroughput: ReadonlyArray<Readonly<{ date: string; started: number; completed: number }>>;
  tasksByStatus: ReadonlyArray<Readonly<{ status: "pending" | "running" | "completed"; count: number }>>;
  runsByWorkflow: ReadonlyArray<Readonly<{ workflowDefinitionId: string; workflowName: string; total: number; active: number; completed: number }>>;
  oldestTasks: ReadonlyArray<Readonly<{
    id: string;
    name: string;
    workflowName: string;
    assigneeName: string;
    status: "pending" | "running";
    updatedAt: string;
  }>>;
}>;

export type OperationalDashboardRepository = Readonly<{
  getOrganization: (organizationId: string, periodDays: DashboardPeriod, periodStart: Date, now: Date) => Promise<OperationalDashboard>;
}>;

export type DashboardPeriod = 7 | 30 | 90;

export function parseDashboardPeriod(value: string | undefined): DashboardPeriod {
  return value === "7" ? 7 : value === "90" ? 90 : 30;
}

type Dependencies = Readonly<{
  repository: OperationalDashboardRepository;
  memberships: MembershipRepository;
  authorization: OrganizationAuthorizationService;
}>;

export async function getOperationalDashboard(dependencies: Dependencies, actorUserId: string, organizationId: string, periodDays: DashboardPeriod = 30, now = new Date()) {
  const membership = await dependencies.memberships.find(organizationId, actorUserId);
  if (!membership) throw new OrganizationNotFoundError();
  dependencies.authorization.require(membership.role, ORGANIZATION_PERMISSIONS.dashboardOrganizationRead);
  const periodStart = new Date(now);
  periodStart.setUTCHours(0, 0, 0, 0);
  periodStart.setUTCDate(periodStart.getUTCDate() - periodDays + 1);
  return dependencies.repository.getOrganization(organizationId, periodDays, periodStart, now);
}

import { DashboardPage } from "@/modules/dashboard/presentation/pages/DashboardPage";
import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { listPersistedWorkflows } from "@/modules/workflows/application/listPersistedWorkflows";
import { createWorkflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";
import type { Workflow } from "@/modules/workflows/domain/workflowEngine";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { getActiveOrganizationId } from "@/modules/organizations/presentation/server/activeOrganization";
import { getDashboardMetrics, type DashboardMetrics } from "@/modules/dashboard/application/dashboardMetrics";
import { PrismaDashboardMetricsRepository } from "@/modules/dashboard/infrastructure/prismaDashboardMetricsRepository";
import { getOperationalDashboard, parseDashboardPeriod, type OperationalDashboard } from "@/modules/dashboard/application/operationalDashboard";
import { PrismaOperationalDashboardRepository } from "@/modules/dashboard/infrastructure/prismaOperationalDashboardRepository";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { AuthorizationDeniedError, OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";

export default async function Home({ searchParams }: Readonly<{ searchParams: Promise<{ period?: string }> }>) {
  const user = await requireAuthenticatedPageUser();
  const period = parseDashboardPeriod((await searchParams).period);
  let workflows: Workflow[] = [];
  let loadError: string | null = null;
  let metrics: DashboardMetrics = { activeWorkflows: 0, closedWorkflows: 0, pendingTasks: 0, completedTasksToday: 0 };
  let operational: OperationalDashboard | null = null;
  try {
    const organizationId = await getActiveOrganizationId(user.userId);
    workflows = [...await listPersistedWorkflows(createWorkflowPersistenceDependencies(user.userId, organizationId), { limit: 3 })];
    metrics = await getDashboardMetrics(new PrismaDashboardMetricsRepository(), user.userId, organizationId);
    try {
      operational = await getOperationalDashboard({ repository: new PrismaOperationalDashboardRepository(), memberships: new PrismaMembershipRepository(), authorization: new OrganizationAuthorizationService() }, user.userId, organizationId, period);
    } catch (error) {
      if (!(error instanceof AuthorizationDeniedError)) throw error;
    }
  } catch {
    loadError = "Não foi possível carregar seus workflows. Tente novamente em instantes.";
  }
  return <DashboardPage userName={user.name} logoutControl={<LogoutButton />} workflows={workflows} metrics={metrics} operational={operational} loadError={loadError} />;
}

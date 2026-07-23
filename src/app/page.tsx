import { DashboardPage } from "@/modules/dashboard/presentation/pages/DashboardPage";
import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { listPersistedWorkflows } from "@/modules/workflows/application/listPersistedWorkflows";
import { createWorkflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";
import type { Workflow } from "@/modules/workflows/domain/workflowEngine";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { getActiveOrganizationId } from "@/modules/organizations/presentation/server/activeOrganization";
import { getDashboardMetrics, type DashboardMetrics } from "@/modules/dashboard/application/dashboardMetrics";
import { PrismaDashboardMetricsRepository } from "@/modules/dashboard/infrastructure/prismaDashboardMetricsRepository";

export default async function Home() {
  const user = await requireAuthenticatedPageUser();
  let workflows: Workflow[] = [];
  let loadError: string | null = null;
  let metrics: DashboardMetrics = { activeWorkflows: 0, closedWorkflows: 0, pendingTasks: 0, completedTasksToday: 0 };
  try {
    const organizationId = await getActiveOrganizationId(user.userId);
    workflows = [...await listPersistedWorkflows(createWorkflowPersistenceDependencies(user.userId, organizationId), { limit: 3 })];
    metrics = await getDashboardMetrics(new PrismaDashboardMetricsRepository(), user.userId, organizationId);
  } catch {
    loadError = "Não foi possível carregar seus workflows. Tente novamente em instantes.";
  }
  return <DashboardPage userName={user.name} logoutControl={<LogoutButton />} workflows={workflows} metrics={metrics} loadError={loadError} />;
}

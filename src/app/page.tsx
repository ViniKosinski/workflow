import { DashboardPage } from "@/modules/dashboard/presentation/pages/DashboardPage";
import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { listPersistedWorkflows } from "@/modules/workflows/application/listPersistedWorkflows";
import { createWorkflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";
import type { Workflow } from "@/modules/workflows/domain/workflowEngine";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { getActiveOrganizationId } from "@/modules/organizations/presentation/server/activeOrganization";
import { listMyTasks } from "@/modules/tasks/application/listMyTasks";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";

export default async function Home() {
  const user = await requireAuthenticatedPageUser();
  let workflows: Workflow[] = [];
  let loadError: string | null = null;
  let pendingTaskCount = 0;
  try {
    workflows = [...await listPersistedWorkflows(createWorkflowPersistenceDependencies(user.userId, await getActiveOrganizationId(user.userId)), { limit: 3 })];
    pendingTaskCount = (await listMyTasks(createTaskDependencies(user.userId), user.userId)).length;
  } catch {
    loadError = "Não foi possível carregar seus workflows. Tente novamente em instantes.";
  }
  return <DashboardPage userName={user.name} logoutControl={<LogoutButton />} workflows={workflows} pendingTaskCount={pendingTaskCount} loadError={loadError} />;
}

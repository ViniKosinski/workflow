import { DashboardPage } from "@/modules/dashboard/presentation/pages/DashboardPage";
import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { listPersistedWorkflows } from "@/modules/workflows/application/listPersistedWorkflows";
import { createWorkflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";
import type { Workflow } from "@/modules/workflows/domain/workflowEngine";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";

export default async function Home() {
  const user = await requireAuthenticatedPageUser();
  let workflows: Workflow[] = [];
  let loadError: string | null = null;
  try {
    workflows = [...await listPersistedWorkflows(createWorkflowPersistenceDependencies(user.userId), { limit: 3 })];
  } catch {
    loadError = "Não foi possível carregar seus workflows. Tente novamente em instantes.";
  }
  return <DashboardPage userName={user.name} logoutControl={<LogoutButton />} workflows={workflows} loadError={loadError} />;
}

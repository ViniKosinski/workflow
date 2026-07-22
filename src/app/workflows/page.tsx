import { WorkflowsPage } from "@/modules/workflows/presentation/pages/WorkflowsPage";
import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { createWorkflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";

export default async function Page({ searchParams }: Readonly<{ searchParams: Promise<{ page?: string }> }>) {
  const user = await requireAuthenticatedPageUser("/workflows");
  const requested = Number((await searchParams).page ?? 1);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  return <WorkflowsPage userName={user.name} logoutControl={<LogoutButton />} dependencies={createWorkflowPersistenceDependencies(user.userId)} page={page} />;
}

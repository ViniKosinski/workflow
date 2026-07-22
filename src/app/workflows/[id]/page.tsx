import { WorkflowDetailsPage } from "@/modules/workflows/presentation/pages/WorkflowDetailsPage";
import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { createWorkflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { getActiveOrganizationId } from "@/modules/organizations/presentation/server/activeOrganization";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const user = await requireAuthenticatedPageUser(`/workflows/${id}`);

  return <WorkflowDetailsPage workflowId={id} userName={user.name} logoutControl={<LogoutButton />} dependencies={createWorkflowPersistenceDependencies(user.userId, await getActiveOrganizationId(user.userId))} />;
}

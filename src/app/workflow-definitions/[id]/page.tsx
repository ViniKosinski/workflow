import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { WorkflowDefinitionDetailsScreen } from "@/modules/workflowDefinitions/presentation/components/WorkflowDefinitionDetailsScreen";
import { AppHeader } from "@/shared/components/layout/AppHeader";

export default async function Page({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const user = await requireAuthenticatedPageUser(`/workflow-definitions/${id}`);
  return <main className="min-h-screen bg-slate-50"><AppHeader logoutControl={<LogoutButton />} userName={user.name} /><WorkflowDefinitionDetailsScreen id={id} /></main>;
}

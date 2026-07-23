import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { WorkflowDefinitionListScreen } from "@/modules/workflowDefinitions/presentation/components/WorkflowDefinitionListScreen";
import { AppHeader } from "@/shared/components/layout/AppHeader";

export default async function Page() {
  const user = await requireAuthenticatedPageUser("/workflow-definitions");
  return <main className="min-h-screen bg-slate-50"><AppHeader logoutControl={<LogoutButton />} userName={user.name} /><WorkflowDefinitionListScreen /></main>;
}

import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { AppHeader } from "@/shared/components/layout/AppHeader";
import { WorkflowRunDynamicForm } from "@/modules/workflowDefinitions/presentation/components/WorkflowRunDynamicForm";

export default async function WorkflowRunPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const user = await requireAuthenticatedPageUser();
  const { id } = await params;
  return <main className="min-h-screen bg-slate-50"><AppHeader logoutControl={<LogoutButton />} userName={user.name} /><WorkflowRunDynamicForm runId={id} /></main>;
}

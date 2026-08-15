import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { OrganizationTaskList } from "@/modules/tasks/presentation/components/OrganizationTaskList";
import { AppHeader } from "@/shared/components/layout/AppHeader";

export default async function OrganizationTasksPage() {
  const user = await requireAuthenticatedPageUser("/tasks/organization");
  return <main className="min-h-screen bg-slate-50"><AppHeader userName={user.name} logoutControl={<LogoutButton />} /><section className="mx-auto max-w-6xl px-6 py-10"><h1 className="text-3xl font-bold">Tarefas da organização</h1><p className="mb-8 mt-2 text-slate-600">Acompanhe responsáveis, andamento e histórico das tarefas da organização ativa.</p><OrganizationTaskList /></section></main>;
}

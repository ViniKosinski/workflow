import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { TaskList } from "@/modules/tasks/presentation/components/TaskList";
import { AppHeader } from "@/shared/components/layout/AppHeader";

export default async function TasksPage() {
  const user = await requireAuthenticatedPageUser("/tasks");
  return <main className="min-h-screen bg-slate-50"><AppHeader userName={user.name} logoutControl={<LogoutButton />} /><section className="mx-auto max-w-6xl px-6 py-10"><h1 className="text-3xl font-bold">Minha fila</h1><p className="mb-8 mt-2 text-slate-600">Encontre, inicie e conclua as tarefas atribuídas a você.</p><TaskList /></section></main>;
}

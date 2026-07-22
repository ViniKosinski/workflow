import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { TaskDetails } from "@/modules/tasks/presentation/components/TaskDetails";
import { AppHeader } from "@/shared/components/layout/AppHeader";

export default async function TaskPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const user = await requireAuthenticatedPageUser("/tasks");
  const { id } = await params;
  return <main className="min-h-screen bg-slate-50"><AppHeader userName={user.name} logoutControl={<LogoutButton />} /><section className="mx-auto max-w-4xl px-6 py-10"><TaskDetails taskId={id} /></section></main>;
}

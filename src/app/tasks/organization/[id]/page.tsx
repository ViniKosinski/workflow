import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { OrganizationTaskDetails } from "@/modules/tasks/presentation/components/OrganizationTaskDetails";
import { AppHeader } from "@/shared/components/layout/AppHeader";

export default async function OrganizationTaskPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ organizationId?: string }> }>) {
  const user = await requireAuthenticatedPageUser("/tasks/organization");
  const [{ id }, { organizationId = "" }] = await Promise.all([params, searchParams]);
  return <main className="min-h-screen bg-slate-50"><AppHeader userName={user.name} logoutControl={<LogoutButton />} /><section className="mx-auto max-w-4xl px-6 py-10"><OrganizationTaskDetails organizationId={organizationId} taskId={id} /></section></main>;
}

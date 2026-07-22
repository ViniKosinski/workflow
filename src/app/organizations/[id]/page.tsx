import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { OrganizationDetailsScreen } from "@/modules/organizations/presentation/components/OrganizationDetailsScreen";
import { AppHeader } from "@/shared/components/layout/AppHeader";

export default async function Page({ params }: Readonly<{ params: Promise<{ id: string }> }>) { const { id } = await params; const user = await requireAuthenticatedPageUser(`/organizations/${id}`); return <main className="min-h-screen bg-slate-50"><AppHeader logoutControl={<LogoutButton />} userName={user.name} /><OrganizationDetailsScreen organizationId={id} /></main>; }

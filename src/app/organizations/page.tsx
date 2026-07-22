import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { OrganizationsScreen } from "@/modules/organizations/presentation/components/OrganizationsScreen";
import { AppHeader } from "@/shared/components/layout/AppHeader";

export default async function Page() { const user = await requireAuthenticatedPageUser("/organizations"); return <main className="min-h-screen bg-slate-50"><AppHeader logoutControl={<LogoutButton />} userName={user.name} /><OrganizationsScreen /></main>; }

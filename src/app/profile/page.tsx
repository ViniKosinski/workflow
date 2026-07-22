import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { ProfileForm } from "@/modules/auth/presentation/components/ProfileForm";
import { AppHeader } from "@/shared/components/layout/AppHeader";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { ChangePasswordForm } from "@/modules/auth/presentation/components/ChangePasswordForm";

export default async function ProfilePage() {
  const user = await requireAuthenticatedPageUser("/profile");
  return <main className="min-h-screen bg-slate-50"><AppHeader userName={user.name} logoutControl={<LogoutButton />} /><section className="mx-auto w-full max-w-3xl px-6 py-8"><h1 className="text-3xl font-bold text-slate-950">Perfil</h1><p className="mt-2 mb-6 text-sm text-slate-600">Gerencie seus dados pessoais.</p><ProfileForm name={user.name} email={user.email} /><ChangePasswordForm /></section></main>;
}

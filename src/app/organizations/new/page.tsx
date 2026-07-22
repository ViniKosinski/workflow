import Link from "next/link";
import { requireAuthenticatedPageUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { LogoutButton } from "@/modules/auth/presentation/components/LogoutButton";
import { NewOrganizationForm } from "@/modules/organizations/presentation/components/NewOrganizationForm";
import { AppHeader } from "@/shared/components/layout/AppHeader";

export default async function Page() { const user = await requireAuthenticatedPageUser("/organizations/new"); return <main className="min-h-screen bg-slate-50"><AppHeader logoutControl={<LogoutButton />} userName={user.name} /><section className="mx-auto w-full max-w-6xl px-6 py-8"><Link className="text-sm font-semibold text-brand-700" href="/organizations">← Organizações</Link><h1 className="mt-4 text-3xl font-bold text-slate-950">Nova organização</h1><p className="mt-2 mb-6 text-sm text-slate-600">Crie um novo espaço para colaborar.</p><NewOrganizationForm /></section></main>; }

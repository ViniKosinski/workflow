import Link from "next/link";
import { OrganizationSwitcher } from "@/modules/organizations/presentation/components/OrganizationSwitcher";

export function AppHeader({ userName, logoutControl }: Readonly<{ userName: string; logoutControl: React.ReactNode }>) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-col items-start gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <div>
          <Link className="text-lg font-bold text-slate-950" href="/">
            Workflow
          </Link>
          <p className="text-xs text-slate-500">Processos e operações</p>
        </div>

        <nav className="flex flex-wrap items-center justify-start gap-x-4 gap-y-2 text-sm font-medium text-slate-600 sm:justify-end sm:gap-y-1">
          <OrganizationSwitcher />
          <Link href="/">Painel</Link>
          <Link href="/workflows">Fluxos</Link>
          <Link href="/workflow-definitions">Definições</Link>
          <Link href="/tasks">Minha fila</Link>
          <Link href="/tasks/organization">Tarefas da organização</Link>
          <Link href="/organizations">Organizações</Link>
          <Link href="/workflows/new">Novo fluxo</Link>
          <Link href="/profile">{userName}</Link>
          {logoutControl}
        </nav>
      </div>
    </header>
  );
}

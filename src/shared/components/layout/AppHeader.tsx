import Link from "next/link";

export function AppHeader({ userName, logoutControl }: Readonly<{ userName: string; logoutControl: React.ReactNode }>) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div>
          <Link className="text-lg font-bold text-slate-950" href="/">
            Workflow
          </Link>
          <p className="text-xs text-slate-500">Processos e operações</p>
        </div>

        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm font-medium text-slate-600">
          <Link href="/">Painel</Link>
          <Link href="/workflows">Fluxos</Link>
          <Link href="/workflows/new">Novo fluxo</Link>
          <Link href="/profile">{userName}</Link>
          {logoutControl}
        </nav>
      </div>
    </header>
  );
}

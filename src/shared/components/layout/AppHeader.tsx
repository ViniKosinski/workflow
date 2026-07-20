export function AppHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div>
          <p className="text-lg font-bold text-slate-950">Workflow</p>
          <p className="text-xs text-slate-500">Processos e operações</p>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
          <a href="#">Painel</a>
          <a href="#">Processos</a>
          <a href="#">Relatórios</a>
        </nav>
      </div>
    </header>
  );
}

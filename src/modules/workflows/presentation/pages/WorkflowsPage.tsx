import Link from "next/link";
import type { WorkflowApplicationDependencies } from "@/modules/workflows/application/workflowApplicationTypes";
import { listPersistedWorkflows } from "@/modules/workflows/application/listPersistedWorkflows";
import type { Workflow } from "@/modules/workflows/domain/workflowEngine";
import { WorkflowList } from "@/modules/workflows/presentation/components/WorkflowList";
import { AppHeader } from "@/shared/components/layout/AppHeader";
import { Button } from "@/shared/components/ui/Button";

export async function WorkflowsPage({ userName, logoutControl, dependencies, page }: Readonly<{ userName: string; logoutControl: React.ReactNode; dependencies: WorkflowApplicationDependencies; page: number }>) {
  let workflows: Workflow[] = [];
  let error: string | null = null;

  try {
    workflows = [...(await listPersistedWorkflows(dependencies, { limit: 21, offset: (page - 1) * 20 }))];
  } catch {
    error = "Não foi possível carregar os fluxos. Verifique a conexão com o banco.";
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader userName={userName} logoutControl={logoutControl} />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-950">Fluxos</h1>
            <p className="mt-2 text-sm text-slate-600">
              Gerencie processos, etapas e execuções.
            </p>
          </div>
          <Link href="/workflows/new">
            <Button>Novo fluxo</Button>
          </Link>
        </div>

        {error ? (
          <div className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <>
            <WorkflowList workflows={workflows.slice(0, 20)} />
            <nav aria-label="Paginação de workflows" className="flex items-center justify-between text-sm">
              {page > 1 ? <Link className="font-semibold text-brand-700" href={`/workflows?page=${page - 1}`}>Página anterior</Link> : <span />}
              {workflows.length > 20 ? <Link className="font-semibold text-brand-700" href={`/workflows?page=${page + 1}`}>Próxima página</Link> : <span />}
            </nav>
          </>
        )}
      </section>
    </main>
  );
}

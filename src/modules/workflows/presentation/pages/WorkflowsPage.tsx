import Link from "next/link";
import { listPersistedWorkflows } from "@/modules/workflows/application/listPersistedWorkflows";
import type { Workflow } from "@/modules/workflows/domain/workflowEngine";
import { WorkflowList } from "@/modules/workflows/presentation/components/WorkflowList";
import { workflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";
import { AppHeader } from "@/shared/components/layout/AppHeader";
import { Button } from "@/shared/components/ui/Button";

export async function WorkflowsPage() {
  let workflows: Workflow[] = [];
  let error: string | null = null;

  try {
    workflows = [...(await listPersistedWorkflows(workflowPersistenceDependencies))];
  } catch {
    error = "Não foi possível carregar os fluxos. Verifique a conexão com o banco.";
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

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
          <WorkflowList workflows={workflows} />
        )}
      </section>
    </main>
  );
}

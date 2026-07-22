import Link from "next/link";
import type { Workflow } from "@/modules/workflows/domain/workflowEngine";
import { WorkflowList } from "@/modules/workflows/presentation/components/WorkflowList";
import { AppHeader } from "@/shared/components/layout/AppHeader";
import { Button } from "@/shared/components/ui/Button";

export function DashboardPage({ userName, logoutControl, workflows, loadError }: Readonly<{ userName: string; logoutControl: React.ReactNode; workflows: ReadonlyArray<Workflow>; loadError: string | null }>) {
  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader userName={userName} logoutControl={logoutControl} />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
        <div className="flex flex-col gap-5 border-b border-slate-200 pb-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">
              Plataforma Workflow
            </p>
            <h1 className="mt-3 text-4xl font-bold text-slate-950 md:text-5xl">
              Gestão clara para processos empresariais.
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              Organize fluxos, acompanhe etapas críticas e mantenha times
              alinhados em uma base preparada para evoluir.
            </p>
          </div>

          <Link href="/workflows/new">
            <Button>Nova automação</Button>
          </Link>
        </div>

        {loadError ? <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{loadError}</div> : <WorkflowList workflows={workflows} />}
      </section>
    </main>
  );
}

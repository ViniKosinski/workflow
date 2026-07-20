import { AppHeader } from "@/components/layout/AppHeader";
import { WorkflowCard } from "@/components/workflow/WorkflowCard";
import { Button } from "@/components/ui/Button";
import { workflowSummaries } from "@/lib/workflows";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader />

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

          <Button>Nova automação</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {workflowSummaries.map((workflow) => (
            <WorkflowCard key={workflow.title} workflow={workflow} />
          ))}
        </div>
      </section>
    </main>
  );
}

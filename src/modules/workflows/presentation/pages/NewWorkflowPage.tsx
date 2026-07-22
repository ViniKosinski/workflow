import Link from "next/link";
import { WorkflowForm } from "@/modules/workflows/presentation/components/WorkflowForm";
import { AppHeader } from "@/shared/components/layout/AppHeader";

export function NewWorkflowPage({ userName, logoutControl }: Readonly<{ userName: string; logoutControl: React.ReactNode }>) {
  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader userName={userName} logoutControl={logoutControl} />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
        <div className="border-b border-slate-200 pb-6">
          <Link className="text-sm font-semibold text-brand-700" href="/workflows">
            Voltar para fluxos
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Novo fluxo
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Defina o nome e as etapas obrigatórias do processo.
          </p>
        </div>

        <WorkflowForm />
      </section>
    </main>
  );
}

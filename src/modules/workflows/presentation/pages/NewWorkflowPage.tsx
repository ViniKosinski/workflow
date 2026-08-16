import Link from "next/link";
import { WorkflowForm } from "@/modules/workflows/presentation/components/WorkflowForm";
import { AppHeader } from "@/shared/components/layout/AppHeader";

export function NewWorkflowPage({ userName, logoutControl }: Readonly<{ userName: string; logoutControl: React.ReactNode }>) {
  return (
    <main className="min-h-screen bg-slate-50">
      <AppHeader userName={userName} logoutControl={logoutControl} />

      <section className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <div className="border-b border-slate-200 pb-6">
          <Link className="text-sm font-semibold text-brand-700" href="/workflows">
            Voltar para fluxos
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">
            Novo fluxo
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Desenhe o caminho principal do processo em um quadro visual. Depois, configure responsáveis, resultados e ramificações.
          </p>
        </div>

        <WorkflowForm />
      </section>
    </main>
  );
}

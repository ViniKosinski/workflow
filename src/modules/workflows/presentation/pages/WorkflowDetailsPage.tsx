import Link from "next/link";
import { getPersistedWorkflowById } from "@/modules/workflows/application/getPersistedWorkflowById";
import { WORKFLOW_STATUSES } from "@/modules/workflows/domain/workflowEngine";
import { DraftWorkflowStepsEditor } from "@/modules/workflows/presentation/components/DraftWorkflowStepsEditor";
import { WorkflowExecutionPanel } from "@/modules/workflows/presentation/components/WorkflowExecutionPanel";
import { WorkflowHistory } from "@/modules/workflows/presentation/components/WorkflowHistory";
import { WorkflowStatusBadge } from "@/modules/workflows/presentation/components/WorkflowStatusBadge";
import { WorkflowStepsList } from "@/modules/workflows/presentation/components/WorkflowStepsList";
import { workflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";
import { AppHeader } from "@/shared/components/layout/AppHeader";

type WorkflowDetailsPageProps = {
  workflowId: string;
};

export async function WorkflowDetailsPage({
  workflowId,
}: WorkflowDetailsPageProps) {
  try {
    const workflow = await getPersistedWorkflowById(
      workflowPersistenceDependencies,
      workflowId,
    );

    return (
      <main className="min-h-screen bg-slate-50">
        <AppHeader />

        <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
          <div className="border-b border-slate-200 pb-6">
            <Link
              className="text-sm font-semibold text-brand-700"
              href="/workflows"
            >
              Voltar para fluxos
            </Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-950">
                {workflow.name}
              </h1>
              <WorkflowStatusBadge status={workflow.status} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {workflow.steps.length} etapas cadastradas
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            {workflow.status === WORKFLOW_STATUSES.draft ? (
              <DraftWorkflowStepsEditor workflow={workflow} />
            ) : (
              <WorkflowStepsList workflow={workflow} />
            )}

            <div className="flex flex-col gap-6">
              <WorkflowExecutionPanel workflow={workflow} />
              <WorkflowHistory workflow={workflow} />
            </div>
          </div>
        </section>
      </main>
    );
  } catch {
    return (
      <main className="min-h-screen bg-slate-50">
        <AppHeader />
        <section className="mx-auto w-full max-w-6xl px-6 py-8">
          <Link className="text-sm font-semibold text-brand-700" href="/workflows">
            Voltar para fluxos
          </Link>
          <div className="mt-6 border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Não foi possível carregar este fluxo.
          </div>
        </section>
      </main>
    );
  }
}

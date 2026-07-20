import type { WorkflowSummary } from "@/modules/workflows/domain/workflow";

type WorkflowCardProps = {
  workflow: WorkflowSummary;
};

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">
          {workflow.title}
        </h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {workflow.status}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {workflow.description}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Etapas</dt>
          <dd className="font-semibold text-slate-900">{workflow.steps}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Responsável</dt>
          <dd className="font-semibold text-slate-900">{workflow.owner}</dd>
        </div>
      </dl>
    </article>
  );
}

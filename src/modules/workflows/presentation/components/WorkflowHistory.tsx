import type { Workflow } from "@/modules/workflows/domain/workflowEngine";

type WorkflowHistoryProps = {
  workflow: Workflow;
};

export function WorkflowHistory({ workflow }: WorkflowHistoryProps) {
  return (
    <div className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Histórico</h2>
      </div>

      <div className="divide-y divide-slate-100">
        {workflow.executionHistory.map((event) => (
          <div className="px-5 py-4" key={event.id}>
            <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-medium text-slate-950">
                {event.message}
              </p>
              <p className="text-xs text-slate-500">
                {new Date(event.timestamp).toLocaleString("pt-BR")}
              </p>
            </div>
            <p className="mt-1 text-xs text-slate-500">{event.type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

import {
  WORKFLOW_STEP_STATUS_LABELS,
  type Workflow,
} from "@/modules/workflows/domain/workflowEngine";

type WorkflowStepsListProps = {
  workflow: Workflow;
};

export function WorkflowStepsList({ workflow }: WorkflowStepsListProps) {
  return (
    <div className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Etapas</h2>
      </div>

      <div className="divide-y divide-slate-100">
        {workflow.steps.map((step) => (
          <div className="flex items-center justify-between gap-4 px-5 py-4" key={step.id}>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center bg-slate-100 text-sm font-semibold text-slate-600">
                {step.order}
              </span>
              <div>
                <p className="font-medium text-slate-950">{step.name}</p>
                {workflow.currentStepId === step.id ? (
                  <p className="text-xs text-brand-700">Etapa atual</p>
                ) : null}
              </div>
            </div>
            <span className="text-sm text-slate-600">
              {WORKFLOW_STEP_STATUS_LABELS[step.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

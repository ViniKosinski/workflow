import {
  WORKFLOW_STEP_STATUS_LABELS,
  WORKFLOW_STEP_STATUSES,
  type Workflow,
  type WorkflowStep,
} from "@/modules/workflows/domain/workflowEngine";

type WorkflowStepsListProps = {
  workflow: Workflow;
};

const stepStatusClassNames = {
  pending: "border-slate-200 bg-white",
  running: "border-brand-300 bg-brand-50",
  completed: "border-emerald-200 bg-emerald-50",
  failed: "border-rose-200 bg-rose-50",
};

const stepNumberClassNames = {
  pending: "bg-slate-100 text-slate-600",
  running: "bg-brand-600 text-white",
  completed: "bg-emerald-600 text-white",
  failed: "bg-rose-600 text-white",
};

function getStepHint(workflow: Workflow, step: WorkflowStep) {
  if (workflow.currentStepId === step.id) {
    return "Etapa atual";
  }

  if (step.status === WORKFLOW_STEP_STATUSES.completed) {
    return "Concluída";
  }

  if (step.status === WORKFLOW_STEP_STATUSES.failed) {
    return "Falhou";
  }

  return "Próxima etapa";
}

export function WorkflowStepsList({ workflow }: WorkflowStepsListProps) {
  const orderedSteps = [...workflow.steps].sort(
    (firstStep, secondStep) => firstStep.order - secondStep.order,
  );

  return (
    <div className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Etapas</h2>
      </div>

      <div className="flex flex-col gap-3 p-5">
        {orderedSteps.map((step) => (
          <div
            className={`flex items-center justify-between gap-4 border px-4 py-3 ${stepStatusClassNames[step.status]}`}
            key={step.id}
          >
            <div className="flex items-center gap-3">
              <span
                className={`flex h-9 w-9 items-center justify-center text-sm font-semibold ${stepNumberClassNames[step.status]}`}
              >
                {step.order}
              </span>
              <div>
                <p className="font-medium text-slate-950">{step.name}</p>
                <p className="text-xs text-slate-500">
                  {getStepHint(workflow, step)}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-sm font-medium text-slate-600">
              {WORKFLOW_STEP_STATUS_LABELS[step.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

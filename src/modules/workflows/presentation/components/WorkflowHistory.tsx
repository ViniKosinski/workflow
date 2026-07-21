import {
  WORKFLOW_EVENT_TYPES,
  WORKFLOW_STEP_EVENT_TYPES,
  type Workflow,
  type WorkflowExecutionEvent,
} from "@/modules/workflows/domain/workflowEngine";

type WorkflowHistoryProps = {
  workflow: Workflow;
};

function formatEventDate(timestamp: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function getEventStyle(event: WorkflowExecutionEvent) {
  if (
    event.type === WORKFLOW_EVENT_TYPES.workflowFailed ||
    event.type === WORKFLOW_STEP_EVENT_TYPES.stepFailed
  ) {
    return {
      label: "Falha",
      markerClassName: "bg-rose-500",
      textClassName: "text-rose-700",
    };
  }

  if (event.type === WORKFLOW_EVENT_TYPES.workflowCancelled) {
    return {
      label: "Cancelamento",
      markerClassName: "bg-zinc-500",
      textClassName: "text-zinc-700",
    };
  }

  if (
    event.type === WORKFLOW_EVENT_TYPES.workflowCompleted ||
    event.type === WORKFLOW_STEP_EVENT_TYPES.stepCompleted
  ) {
    return {
      label: "Conclusão",
      markerClassName: "bg-emerald-500",
      textClassName: "text-emerald-700",
    };
  }

  if (
    event.type === WORKFLOW_EVENT_TYPES.executionStarted ||
    event.type === WORKFLOW_STEP_EVENT_TYPES.stepStarted
  ) {
    return {
      label: "Início",
      markerClassName: "bg-brand-500",
      textClassName: "text-brand-700",
    };
  }

  return {
    label: "Registro",
    markerClassName: "bg-slate-400",
    textClassName: "text-slate-600",
  };
}

export function WorkflowHistory({ workflow }: WorkflowHistoryProps) {
  const orderedEvents = [...workflow.executionHistory].sort(
    (firstEvent, secondEvent) =>
      new Date(firstEvent.timestamp).getTime() -
      new Date(secondEvent.timestamp).getTime(),
  );

  return (
    <div className="border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Histórico</h2>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {orderedEvents.map((event) => {
          const eventStyle = getEventStyle(event);

          return (
            <div className="flex gap-3" key={event.id}>
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${eventStyle.markerClassName}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-medium text-slate-950">
                    {event.message}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatEventDate(event.timestamp)}
                  </p>
                </div>
                <p
                  className={`mt-1 text-xs font-semibold ${eventStyle.textClassName}`}
                >
                  {eventStyle.label}
                </p>
                {event.error ? (
                  <p className="mt-1 text-xs text-rose-600">{event.error}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

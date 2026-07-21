import {
  WORKFLOW_STATUS_LABELS,
  type WorkflowStatus,
} from "@/modules/workflows/domain/workflowEngine";

type WorkflowStatusBadgeProps = {
  status: WorkflowStatus;
};

const statusClassNames: Record<WorkflowStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  ready: "bg-cyan-50 text-cyan-700",
  running: "bg-emerald-50 text-emerald-700",
  completed: "bg-indigo-50 text-indigo-700",
  failed: "bg-rose-50 text-rose-700",
  cancelled: "bg-zinc-100 text-zinc-700",
};

export function WorkflowStatusBadge({ status }: WorkflowStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassNames[status]}`}
    >
      {WORKFLOW_STATUS_LABELS[status]}
    </span>
  );
}

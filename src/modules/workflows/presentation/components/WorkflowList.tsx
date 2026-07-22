import Link from "next/link";
import type { Workflow } from "@/modules/workflows/domain/workflowEngine";
import { WorkflowStatusBadge } from "@/modules/workflows/presentation/components/WorkflowStatusBadge";

type WorkflowListProps = {
  workflows: ReadonlyArray<Workflow>;
};

export function WorkflowList({ workflows }: WorkflowListProps) {
  if (workflows.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 bg-white p-8 text-center">
        <p className="text-sm font-medium text-slate-700">
          Nenhum fluxo cadastrado.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Crie o primeiro fluxo para começar a organizar processos.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3">Fluxo</th>
            <th className="px-4 py-3">Estado</th>
            <th className="px-4 py-3">Etapas</th>
            <th className="px-4 py-3">Atualizado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {workflows.map((workflow) => (
            <tr key={workflow.id} className="hover:bg-slate-50">
              <td className="px-4 py-4">
                <Link
                  className="font-semibold text-slate-950 hover:text-brand-700"
                  href={`/workflows/${workflow.id}`}
                >
                  {workflow.name}
                </Link>
              </td>
              <td className="px-4 py-4">
                <WorkflowStatusBadge status={workflow.status} />
              </td>
              <td className="px-4 py-4 text-slate-600">
                {workflow.steps.length}
              </td>
              <td className="px-4 py-4 text-slate-600">
                {new Date(workflow.updatedAt).toLocaleDateString("pt-BR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

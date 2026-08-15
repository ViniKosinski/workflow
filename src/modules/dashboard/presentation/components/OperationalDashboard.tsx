import Link from "next/link";
import type { OperationalDashboard as OperationalDashboardData } from "@/modules/dashboard/application/operationalDashboard";

const statusLabels = { pending: "Pendentes", running: "Em andamento", completed: "Concluídas" } as const;

function ageLabel(updatedAt: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 3_600_000));
  if (hours < 24) return `${hours}h sem atualização`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "dia" : "dias"} sem atualização`;
}

export function OperationalDashboard({ data }: Readonly<{ data: OperationalDashboardData }>) {
  const maximumStatus = Math.max(1, ...data.tasksByStatus.map((item) => item.count));
  return <section className="space-y-6 border-t border-slate-200 pt-8">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Visão gerencial</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Operação da organização</h2><p className="mt-1 text-sm text-slate-600">Indicadores da organização ativa, atualizados ao carregar o painel.</p></div><Link className="text-sm font-semibold text-brand-700 hover:underline" href="/tasks/organization">Ver todas as tarefas</Link></div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Link className="rounded-lg border border-slate-200 bg-white p-5" href="/tasks/organization"><p className="text-sm text-slate-500">Tarefas pendentes</p><strong className="mt-1 block text-3xl">{data.pendingTasks}</strong></Link>
      <Link className="rounded-lg border border-slate-200 bg-white p-5" href="/tasks/organization"><p className="text-sm text-slate-500">Em andamento</p><strong className="mt-1 block text-3xl">{data.runningTasks}</strong></Link>
      <div className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Execuções ativas</p><strong className="mt-1 block text-3xl">{data.activeRuns}</strong></div>
      <div className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Execuções concluídas</p><strong className="mt-1 block text-3xl">{data.completedRuns}</strong></div>
    </div>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">Tarefas por status</h3><div className="mt-5 space-y-4">{data.tasksByStatus.map((item) => <div key={item.status}><div className="mb-1 flex justify-between text-sm"><span>{statusLabels[item.status]}</span><strong>{item.count}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(item.count ? 6 : 0, item.count / maximumStatus * 100)}%` }} /></div></div>)}</div></section>
      <section className="rounded-lg border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">Execuções por workflow</h3>{data.runsByWorkflow.length === 0 ? <p className="mt-5 text-sm text-slate-500">Nenhuma execução registrada.</p> : <ul className="mt-4 divide-y divide-slate-100">{data.runsByWorkflow.map((workflow) => <li className="flex items-center justify-between gap-4 py-3" key={workflow.workflowDefinitionId}><div><p className="font-medium">{workflow.workflowName}</p><p className="text-xs text-slate-500">{workflow.active} ativas · {workflow.completed} concluídas</p></div><strong>{workflow.total}</strong></li>)}</ul>}</section>
    </div>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h3 className="font-bold text-slate-950">Tarefas há mais tempo sem atualização</h3><p className="mt-1 text-sm text-slate-500">Priorize os itens que podem estar parados.</p></div></div>{data.oldestTasks.length === 0 ? <p className="p-6 text-sm text-slate-500">Não há tarefas ativas.</p> : <ul className="divide-y divide-slate-100">{data.oldestTasks.map((task) => <li key={task.id}><Link className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50" href={`/tasks/organization/${task.id}?organizationId=${encodeURIComponent(data.organizationId)}`}><div><p className="font-medium text-slate-950">{task.name}</p><p className="mt-1 text-xs text-slate-500">{task.workflowName} · {task.assigneeName}</p></div><div className="text-right"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{task.status === "running" ? "Em andamento" : "Pendente"}</span><p className="mt-2 text-xs text-amber-700">{ageLabel(task.updatedAt)}</p></div></Link></li>)}</ul>}</section>
  </section>;
}

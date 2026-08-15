import Link from "next/link";
import type { OperationalDashboard as OperationalDashboardData } from "@/modules/dashboard/application/operationalDashboard";

const statusLabels = { pending: "Pendentes", running: "Em andamento", completed: "Concluídas" } as const;

function ageLabel(updatedAt: string) {
  const hours = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 3_600_000));
  if (hours < 24) return `${hours}h sem atualização`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "dia" : "dias"} sem atualização`;
}

function durationLabel(hours: number | null) {
  if (hours === null) return "Sem dados";
  if (hours < 24) return `${hours.toLocaleString("pt-BR")}h`;
  return `${(hours / 24).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} dias`;
}

export function OperationalDashboard({ data }: Readonly<{ data: OperationalDashboardData }>) {
  const maximumStatus = Math.max(1, ...data.tasksByStatus.map((item) => item.count));
  const maximumDaily = Math.max(1, ...data.dailyThroughput.flatMap((item) => [item.started, item.completed]));
  const labelInterval = Math.max(1, Math.ceil(data.dailyThroughput.length / 6));
  return <section className="space-y-6 border-t border-slate-200 pt-8">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Visão gerencial</p><h2 className="mt-1 text-2xl font-bold text-slate-950">Operação da organização</h2><p className="mt-1 text-sm text-slate-600">Indicadores da organização ativa, atualizados ao carregar o painel.</p></div><Link className="text-sm font-semibold text-brand-700 hover:underline" href="/tasks/organization">Ver todas as tarefas</Link></div>
    <nav aria-label="Período das métricas" className="flex flex-wrap gap-2">{([7, 30, 90] as const).map((period) => <Link aria-current={data.periodDays === period ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm font-semibold ${data.periodDays === period ? "border-brand-600 bg-brand-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-brand-400"}`} href={`/?period=${period}`} key={period}>Últimos {period} dias</Link>)}</nav>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Link className="rounded-lg border border-slate-200 bg-white p-5" href="/tasks/organization"><p className="text-sm text-slate-500">Tarefas pendentes</p><strong className="mt-1 block text-3xl">{data.pendingTasks}</strong></Link>
      <Link className="rounded-lg border border-slate-200 bg-white p-5" href="/tasks/organization"><p className="text-sm text-slate-500">Em andamento</p><strong className="mt-1 block text-3xl">{data.runningTasks}</strong></Link>
      <div className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Execuções ativas</p><strong className="mt-1 block text-3xl">{data.activeRuns}</strong></div>
      <div className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Execuções concluídas</p><strong className="mt-1 block text-3xl">{data.completedRuns}</strong></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Iniciadas no período</p><strong className="mt-1 block text-3xl">{data.startedRunsInPeriod}</strong></div>
      <div className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Concluídas no período</p><strong className="mt-1 block text-3xl">{data.completedRunsInPeriod}</strong></div>
      <div className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Duração média da execução</p><strong className="mt-1 block text-3xl">{durationLabel(data.averageCompletionHours)}</strong></div>
      <div className="rounded-lg border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Tempo médio por etapa</p><strong className="mt-1 block text-3xl">{durationLabel(data.averageStepHours)}</strong></div>
    </div>
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-slate-950">Iniciadas versus concluídas</h3><p className="mt-1 text-sm text-slate-500">Movimento diário nos últimos {data.periodDays} dias.</p></div><div className="flex gap-4 text-xs text-slate-600"><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-brand-600" />Iniciadas</span><span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Concluídas</span></div></div>
      <div className="mt-6 overflow-x-auto"><div aria-label={`Execuções iniciadas e concluídas nos últimos ${data.periodDays} dias`} className="flex h-52 min-w-[42rem] items-end gap-1 border-b border-slate-200 px-1" role="img">{data.dailyThroughput.map((day, index) => <div className="flex h-full min-w-1 flex-1 flex-col justify-end" key={day.date}><div className="flex h-40 items-end justify-center gap-px"><span aria-label={`${day.started} iniciadas em ${day.date}`} className="w-1/2 rounded-t-sm bg-brand-600" style={{ height: `${day.started / maximumDaily * 100}%`, minHeight: day.started ? "4px" : 0 }} /><span aria-label={`${day.completed} concluídas em ${day.date}`} className="w-1/2 rounded-t-sm bg-emerald-500" style={{ height: `${day.completed / maximumDaily * 100}%`, minHeight: day.completed ? "4px" : 0 }} /></div><span className="h-8 pt-2 text-center text-[10px] text-slate-400">{index % labelInterval === 0 || index === data.dailyThroughput.length - 1 ? new Date(`${day.date}T00:00:00Z`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }) : ""}</span></div>)}</div></div>
    </section>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-lg border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">Tarefas por status</h3><div className="mt-5 space-y-4">{data.tasksByStatus.map((item) => <div key={item.status}><div className="mb-1 flex justify-between text-sm"><span>{statusLabels[item.status]}</span><strong>{item.count}</strong></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${Math.max(item.count ? 6 : 0, item.count / maximumStatus * 100)}%` }} /></div></div>)}</div></section>
      <section className="rounded-lg border border-slate-200 bg-white p-5"><h3 className="font-bold text-slate-950">Execuções por workflow</h3>{data.runsByWorkflow.length === 0 ? <p className="mt-5 text-sm text-slate-500">Nenhuma execução registrada.</p> : <ul className="mt-4 divide-y divide-slate-100">{data.runsByWorkflow.map((workflow) => <li className="flex items-center justify-between gap-4 py-3" key={workflow.workflowDefinitionId}><div><p className="font-medium">{workflow.workflowName}</p><p className="text-xs text-slate-500">{workflow.active} ativas · {workflow.completed} concluídas</p></div><strong>{workflow.total}</strong></li>)}</ul>}</section>
    </div>
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white"><div className="flex items-center justify-between border-b border-slate-100 p-5"><div><h3 className="font-bold text-slate-950">Tarefas há mais tempo sem atualização</h3><p className="mt-1 text-sm text-slate-500">Priorize os itens que podem estar parados.</p></div></div>{data.oldestTasks.length === 0 ? <p className="p-6 text-sm text-slate-500">Não há tarefas ativas.</p> : <ul className="divide-y divide-slate-100">{data.oldestTasks.map((task) => <li key={task.id}><Link className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50" href={`/tasks/organization/${task.id}?organizationId=${encodeURIComponent(data.organizationId)}`}><div><p className="font-medium text-slate-950">{task.name}</p><p className="mt-1 text-xs text-slate-500">{task.workflowName} · {task.assigneeName}</p></div><div className="text-right"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{task.status === "running" ? "Em andamento" : "Pendente"}</span><p className="mt-2 text-xs text-amber-700">{ageLabel(task.updatedAt)}</p></div></Link></li>)}</ul>}</section>
  </section>;
}

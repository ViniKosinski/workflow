"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TaskHistoryEntry, WorkTask } from "@/modules/tasks/domain/task";

type Detail = Readonly<{ task: WorkTask; history: ReadonlyArray<TaskHistoryEntry> }>;

export function OrganizationTaskDetails({ taskId, organizationId }: Readonly<{ taskId: string; organizationId: string }>) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/tasks/organization/${encodeURIComponent(taskId)}?organizationId=${encodeURIComponent(organizationId)}`)
      .then(async (response) => {
        const data = await response.json() as Detail & { message?: string };
        if (!response.ok) throw new Error(data.message ?? "Não foi possível carregar a tarefa.");
        setDetail(data);
      }).catch((reason: Error) => setError(reason.message));
  }, [organizationId, taskId]);
  if (error) return <div className="rounded-md bg-rose-50 p-4 text-rose-700">{error}</div>;
  if (!detail) return <p className="text-sm text-slate-600">Carregando tarefa...</p>;
  const { task, history } = detail;
  const labels = { pending: "Pendente", running: "Em andamento", completed: "Concluída", failed: "Falhou", skipped: "Ignorada" } as const;
  return <div className="space-y-6">
    <Link className="text-sm font-semibold text-brand-700 hover:underline" href="/tasks/organization">← Voltar às tarefas da organização</Link>
    <section className="rounded-lg border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{task.organizationName} · {task.workflowName}</p><h1 className="mt-2 text-3xl font-bold">{task.stepName}</h1></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{labels[task.status]}</span></div><dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-slate-500">Responsável</dt><dd className="mt-1 font-medium">{task.assigneeName}</dd></div><div><dt className="text-slate-500">Última atualização</dt><dd className="mt-1 font-medium">{new Date(task.createdAt).toLocaleString("pt-BR")}</dd></div></dl><p className="mt-5 rounded-md bg-sky-50 p-3 text-sm text-sky-800">Visualização gerencial somente leitura. A execução continua disponível apenas para o responsável.</p></section>
    <section className="rounded-lg border border-slate-200 bg-white p-6"><h2 className="text-xl font-bold">Histórico</h2>{history.length === 0 ? <p className="mt-4 text-sm text-slate-600">Nenhum evento registrado.</p> : <ol className="mt-4 space-y-4">{history.map((entry) => <li className="border-l-2 border-slate-200 pl-4" key={entry.id}><p className="font-medium">{entry.message}</p><p className="mt-1 text-xs text-slate-500">{new Date(entry.occurredAt).toLocaleString("pt-BR")}{entry.executorName ? ` · ${entry.executorName}` : ""}</p>{entry.observation ? <p className="mt-2 text-sm text-slate-600">Observação: {entry.observation}</p> : null}</li>)}</ol>}</section>
  </div>;
}

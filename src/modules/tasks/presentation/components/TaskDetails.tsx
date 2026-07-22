"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { TaskHistoryEntry, WorkTask } from "@/modules/tasks/domain/task";

export function TaskDetails({ taskId }: Readonly<{ taskId: string }>) {
  const [task, setTask] = useState<WorkTask | null>(null);
  const [history, setHistory] = useState<ReadonlyArray<TaskHistoryEntry>>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [taskResponse, historyResponse] = await Promise.all([fetch(`/api/tasks/${taskId}`), fetch(`/api/tasks/${taskId}/history`)]);
      const taskData = await taskResponse.json() as { task?: WorkTask; message?: string };
      const historyData = await historyResponse.json() as { history?: TaskHistoryEntry[] };
      if (!taskResponse.ok || !taskData.task) throw new Error(taskData.message ?? "Tarefa não encontrada.");
      setTask(taskData.task); setHistory(historyData.history ?? []); setError(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar a tarefa."); }
    finally { setLoading(false); }
  }, [taskId]);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSubmitting(true); setError(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message }) });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Não foi possível concluir a tarefa.");
      window.location.assign("/tasks");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível concluir a tarefa."); setSubmitting(false); }
  }

  if (loading) return <p className="text-sm text-slate-600">Carregando tarefa...</p>;
  if (!task) return <div className="rounded-md bg-rose-50 p-4 text-rose-700">{error}</div>;
  return <div className="space-y-6">
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-500">{task.organizationName} · {task.workflowName}</p>
      <h1 className="mt-2 text-3xl font-bold">{task.stepName}</h1>
      <p className="mt-3 text-sm text-slate-600">Responsável: {task.assigneeName} · Prioridade normal</p>
      {error && <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <form className="mt-6 space-y-3" onSubmit={submit}>
        <label className="block text-sm font-medium">Resultado da execução<textarea className="mt-1 block min-h-28 w-full rounded-md border border-slate-300 p-3" value={message} onChange={(event) => setMessage(event.target.value)} /></label>
        <button disabled={submitting} className="rounded-md bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-60">{submitting ? "Concluindo..." : "Concluir tarefa"}</button>
      </form>
    </div>
    <section><h2 className="text-xl font-semibold">Histórico</h2><ul className="mt-3 space-y-2 text-sm text-slate-600">{history.map((item) => <li key={item.id} className="rounded-md border bg-white p-3">{item.message}{item.executorName ? ` · ${item.executorName}` : ""} · {new Date(item.occurredAt).toLocaleString("pt-BR")}</li>)}</ul></section>
    <Link href="/tasks" className="text-sm font-medium text-brand-700">Voltar para minha fila</Link>
  </div>;
}

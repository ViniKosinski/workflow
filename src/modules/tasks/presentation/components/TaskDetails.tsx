"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { TaskHistoryEntry, WorkTask } from "@/modules/tasks/domain/task";
import type { WorkflowRunForm } from "@/modules/workflowDefinitions/domain/workflowRunFormRepository";

function readValues(form: WorkflowRunForm, element: HTMLFormElement) {
  const data = new FormData(element);
  return Object.fromEntries(form.fields.map((field) => field.type === "boolean" ? [field.key, data.get(field.key) === "on"] : field.type === "multiselect" ? [field.key, data.getAll(field.key)] : [field.key, data.get(field.key)]));
}

function RunFields({ form }: Readonly<{ form: WorkflowRunForm }>) {
  if (form.fields.length === 0) return <p className="text-sm text-slate-500">Esta execução não possui campos adicionais.</p>;
  return <fieldset className="space-y-4"><legend className="text-lg font-semibold">Dados da execução</legend>{form.fields.map((field) => <label className="block text-sm font-medium" key={field.id}>{field.label}{field.required ? " *" : ""}{field.description ? <span className="block text-xs font-normal text-slate-500">{field.description}</span> : null}
    {field.type === "textarea" ? <textarea className="mt-1 min-h-24 w-full rounded-md border p-3" defaultValue={String(form.values[field.key] ?? "")} name={field.key} required={field.required} /> : field.type === "select" ? <select className="mt-1 h-10 w-full rounded-md border px-3" defaultValue={String(form.values[field.key] ?? "")} name={field.key} required={field.required}><option value="">Selecione</option>{field.options.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}</select> : field.type === "multiselect" ? <select className="mt-1 min-h-24 w-full rounded-md border px-3" defaultValue={(form.values[field.key] as string[] | undefined) ?? []} multiple name={field.key} required={field.required}>{field.options.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}</select> : field.type === "boolean" ? <input className="ml-2" defaultChecked={form.values[field.key] === true} name={field.key} type="checkbox" /> : <input className="mt-1 h-10 w-full rounded-md border px-3" defaultValue={String(form.values[field.key] ?? "")} inputMode={field.type === "currency" ? "decimal" : undefined} name={field.key} required={field.required} step={field.type === "number" ? "any" : undefined} type={field.type === "currency" ? "text" : field.type} />}
  </label>)}</fieldset>;
}

export function TaskDetails({ taskId }: Readonly<{ taskId: string }>) {
  const [task, setTask] = useState<WorkTask | null>(null);
  const [history, setHistory] = useState<ReadonlyArray<TaskHistoryEntry>>([]);
  const [form, setForm] = useState<WorkflowRunForm | null>(null);
  const [observation, setObservation] = useState("");
  const [selectedResult, setSelectedResult] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const taskResponse = await fetch(`/api/tasks/${taskId}`);
      const taskData = await taskResponse.json() as { task?: WorkTask; message?: string };
      if (!taskResponse.ok || !taskData.task) throw new Error(taskData.message ?? "Tarefa não encontrada.");
      const [historyResponse, formResponse] = await Promise.all([fetch(`/api/tasks/${taskId}/history`), fetch(`/api/workflow-runs/${taskData.task.workflowId}/form`)]);
      const historyData = await historyResponse.json() as { history?: TaskHistoryEntry[]; message?: string };
      const formData = await formResponse.json() as { form?: WorkflowRunForm; message?: string };
      if (!historyResponse.ok) throw new Error(historyData.message ?? "Não foi possível carregar o histórico.");
      if (!formResponse.ok) throw new Error(formData.message ?? "Não foi possível carregar os dados da execução.");
      setTask(taskData.task); setHistory(historyData.history ?? []); setForm(formData.form ?? null); setError(null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar a tarefa."); }
    finally { setLoading(false); }
  }, [taskId]);
  useEffect(() => { void load(); }, [load]);

  async function start() {
    setSubmitting(true); setError(null); setNotice(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/start`, { method: "POST" });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Não foi possível iniciar a tarefa.");
      setNotice("Tarefa iniciada. Preencha os dados e escolha um resultado."); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível iniciar a tarefa."); }
    finally { setSubmitting(false); }
  }

  async function complete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!task || !form) return;
    setSubmitting(true); setError(null); setNotice(null);
    try {
      const formPayload = form.fields.length > 0 ? { formVersion: form.version, formValues: readValues(form, event.currentTarget) } : {};
      const response = await fetch(`/api/tasks/${taskId}/complete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ result: selectedResult, observation, ...formPayload }) });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Não foi possível concluir a tarefa.");
      window.location.assign("/tasks");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível concluir a tarefa."); setSubmitting(false); }
  }

  if (loading) return <p className="text-sm text-slate-600">Carregando tarefa...</p>;
  if (!task) return <div className="rounded-md bg-rose-50 p-4 text-rose-700">{error}</div>;
  return <div className="space-y-6"><div className="rounded-lg border border-slate-200 bg-white p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm text-slate-500">{task.organizationName} · {task.workflowName}</p><h1 className="mt-2 text-3xl font-bold">{task.stepName}</h1></div><span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{task.status === "running" ? "Em andamento" : "Pendente"}</span></div><p className="mt-3 text-sm text-slate-600">Responsável: {task.assigneeName} · Prioridade normal</p>{error ? <p className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}{notice ? <p aria-live="polite" className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p> : null}
    {task.status === "pending" ? <div className="mt-6 border-t pt-5"><p className="mb-3 text-sm text-slate-600">Inicie a tarefa para liberar o preenchimento e registrar o início da execução.</p><button className="rounded-md bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={submitting} onClick={() => void start()} type="button">{submitting ? "Iniciando..." : "Iniciar tarefa"}</button></div> : null}
    {task.status === "running" && form ? <form className="mt-6 space-y-5 border-t pt-5" onSubmit={complete}><RunFields form={form} /><fieldset><legend className="text-sm font-medium">Resultado</legend><div className="mt-2 flex flex-wrap gap-2">{task.outcomes.map((outcome) => <label key={outcome.result} className={`cursor-pointer rounded-md border px-3 py-2 text-sm ${selectedResult === outcome.result ? "border-brand-600 bg-brand-50" : "border-slate-300"}`}><input className="sr-only" type="radio" name="result" value={outcome.result} checked={selectedResult === outcome.result} onChange={() => setSelectedResult(outcome.result)} required />{outcome.name}</label>)}</div></fieldset><label className="block text-sm font-medium">Observação (opcional)<textarea className="mt-1 block min-h-28 w-full rounded-md border border-slate-300 p-3" maxLength={2000} value={observation} onChange={(event) => setObservation(event.target.value)} /></label><button disabled={submitting || !selectedResult} className="rounded-md bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-60">{submitting ? "Salvando e concluindo..." : "Salvar e concluir tarefa"}</button></form> : null}</div>
    <section><h2 className="text-xl font-semibold">Histórico</h2>{history.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhum evento registrado para esta tarefa.</p> : <ul className="mt-3 space-y-2 text-sm text-slate-600">{history.map((item) => <li key={item.id} className="rounded-md border bg-white p-3"><p>{item.message}{item.selectedResult ? ` · Resultado: ${item.selectedResult}` : ""}{item.executorName ? ` · ${item.executorName}` : ""} · {new Date(item.occurredAt).toLocaleString("pt-BR")}</p>{item.observation ? <p className="mt-1 text-slate-500">Observação: {item.observation}</p> : null}</li>)}</ul>}</section><Link href="/tasks" className="text-sm font-medium text-brand-700">Voltar para minha fila</Link></div>;
}

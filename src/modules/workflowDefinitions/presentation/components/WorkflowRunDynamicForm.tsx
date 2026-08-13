"use client";

import { type FormEvent, useEffect, useState } from "react";
import type { WorkflowRunForm } from "@/modules/workflowDefinitions/domain/workflowRunFormRepository";

export function WorkflowRunDynamicForm({ runId }: Readonly<{ runId: string }>) {
  const [form, setForm] = useState<WorkflowRunForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    fetch(`/api/workflow-runs/${runId}/form`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setForm(body.form);
    }).catch((error) => setMessage(error.message));
  }, [runId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    const data = new FormData(event.currentTarget);
    const values = Object.fromEntries(form.fields.map((field) => {
      if (field.type === "boolean") return [field.key, data.get(field.key) === "on"];
      if (field.type === "multiselect") return [field.key, data.getAll(field.key)];
      return [field.key, data.get(field.key)];
    }));
    setBusy(true);
    const response = await fetch(`/api/workflow-runs/${runId}/form/values`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ version: form.version, values }),
    });
    const body = await response.json();
    if (response.ok) { setForm(body.form); setMessage("Dados salvos."); } else setMessage(body.message);
    setBusy(false);
  }

  if (!form) return <p>{message ?? "Carregando formulário..."}</p>;
  return <form className="mx-auto max-w-3xl space-y-4 px-6 py-8" onSubmit={submit}>
    <h1 className="text-2xl font-bold">Dados da execução</h1>
    {form.fields.map((field) => <label className="block text-sm font-medium" key={field.id}>{field.label}{field.required ? " *" : ""}
      {field.description ? <span className="block text-xs font-normal text-slate-500">{field.description}</span> : null}
      {field.type === "textarea" ? <textarea className="mt-1 min-h-24 w-full border p-3" defaultValue={String(form.values[field.key] ?? "")} name={field.key} required={field.required} /> :
       field.type === "select" ? <select className="mt-1 h-10 w-full border px-3" defaultValue={String(form.values[field.key] ?? "")} name={field.key} required={field.required}><option value="">Selecione</option>{field.options.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}</select> :
       field.type === "multiselect" ? <select className="mt-1 min-h-24 w-full border px-3" defaultValue={(form.values[field.key] as string[] | undefined) ?? []} multiple name={field.key} required={field.required}>{field.options.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}</select> :
       field.type === "boolean" ? <input className="ml-2" defaultChecked={form.values[field.key] === true} name={field.key} type="checkbox" /> :
       <input className="mt-1 h-10 w-full border px-3" defaultValue={String(form.values[field.key] ?? "")} name={field.key} required={field.required} type={field.type === "currency" ? "number" : field.type} step={field.type === "currency" || field.type === "number" ? "any" : undefined} />}
    </label>)}
    <button className="bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={busy}>{busy ? "Salvando..." : "Salvar dados"}</button>
    {message ? <p aria-live="polite">{message}</p> : null}
  </form>;
}

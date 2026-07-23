"use client";

import { useState } from "react";
import type { WorkflowStep, WorkflowStepTransition } from "@/modules/workflows/domain/workflowEngine";

export function WorkflowTransitionsEditor({ workflowId, step, steps }: Readonly<{ workflowId: string; step: WorkflowStep; steps: ReadonlyArray<WorkflowStep> }>) {
  const [transitions, setTransitions] = useState(step.transitions);
  const [name, setName] = useState("");
  const [result, setResult] = useState("");
  const [targetStepId, setTargetStepId] = useState("");
  const [endsWorkflow, setEndsWorkflow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/api/workflows/${workflowId}/steps/${step.id}/transitions`;

  async function send(url: string, method: string, body?: unknown) {
    const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({})) as { workflow?: { steps: WorkflowStep[] }; message?: string };
    if (!response.ok) throw new Error(data.message ?? "Não foi possível atualizar a transição.");
    const updated = data.workflow?.steps.find((item) => item.id === step.id);
    if (updated) setTransitions(updated.transitions);
  }

  async function add(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    try {
      await send(base, "POST", { name, result, targetStepId: endsWorkflow ? undefined : targetStepId, endsWorkflow });
      setName(""); setResult(""); setTargetStepId(""); setEndsWorkflow(false);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Erro ao adicionar transição."); }
  }

  async function remove(transition: WorkflowStepTransition) {
    setError(null);
    try { await send(`${base}/${transition.id}`, "DELETE"); setTransitions((current) => current.filter((item) => item.id !== transition.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Erro ao remover transição."); }
  }

  return <div className="ml-12 border-l-2 border-slate-100 pl-4">
    <p className="text-xs font-semibold uppercase text-slate-500">Resultados e transições</p>
    <ul className="mt-2 space-y-1 text-sm">{transitions.map((transition) => <li className="flex items-center justify-between gap-2" key={transition.id}><span><strong>{transition.name}</strong> ({transition.result}) → {transition.endsWorkflow ? "Encerrar workflow" : steps.find((item) => item.id === transition.targetStepId)?.name ?? "Etapa"}</span><button className="text-xs text-rose-600" type="button" onClick={() => void remove(transition)}>Remover</button></li>)}</ul>
    <form className="mt-3 grid gap-2 md:grid-cols-4" onSubmit={add}>
      <input className="h-9 border px-2 text-sm" placeholder="Nome do resultado" value={name} onChange={(event) => setName(event.target.value)} required />
      <input className="h-9 border px-2 text-sm" placeholder="Código do resultado" value={result} onChange={(event) => setResult(event.target.value)} required />
      <select className="h-9 border px-2 text-sm" disabled={endsWorkflow} value={targetStepId} onChange={(event) => setTargetStepId(event.target.value)} required={!endsWorkflow}><option value="">Etapa destino</option>{steps.filter((item) => item.id !== step.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <div className="flex items-center gap-2"><label className="text-xs"><input type="checkbox" checked={endsWorkflow} onChange={(event) => setEndsWorkflow(event.target.checked)} /> Encerrar</label><button className="text-sm font-semibold text-brand-700" type="submit">Adicionar</button></div>
    </form>
    {error ? <p className="mt-2 text-xs text-rose-700" role="alert">{error}</p> : null}
  </div>;
}

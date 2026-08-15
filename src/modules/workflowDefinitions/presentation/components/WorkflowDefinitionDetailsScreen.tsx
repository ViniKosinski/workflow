"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  WorkflowDefinition,
  WorkflowDefinitionStep,
} from "@/modules/workflowDefinitions/domain/workflowDefinition";
import { WorkflowDefinitionFormEditor } from "@/modules/workflowDefinitions/presentation/components/WorkflowDefinitionFormEditor";

export function WorkflowDefinitionDetailsScreen({ id }: Readonly<{ id: string }>) {
  const router = useRouter();
  const [definition, setDefinition] = useState<WorkflowDefinition | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftSteps, setDraftSteps] = useState<ReadonlyArray<WorkflowDefinitionStep>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyDefinition = useCallback((loaded: WorkflowDefinition) => {
    setDefinition(loaded);
    setDraftName(loaded.name);
    setDraftSteps(loaded.steps);
  }, []);

  const load = useCallback(async () => {
    const response = await fetch(`/api/workflow-definitions/${id}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.message);
    applyDefinition(body.definition);
  }, [applyDefinition, id]);

  useEffect(() => {
    load().catch((error) => setMessage(error.message));
  }, [load]);

  async function action(path: string) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/workflow-definitions/${id}/${path}`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      if (path === "versions") router.push(`/workflow-definitions/${body.definition.id}`);
      else if (path === "runs") router.push(`/workflow-runs/${body.run.id}`);
      else applyDefinition(body.definition);
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Não foi possível executar a ação.");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/workflow-definitions/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message);
      }
      await load();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Não foi possível arquivar a definição.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/workflow-definitions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: draftName, steps: draftSteps }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      applyDefinition(body.definition);
      setMessage("Rascunho salvo.");
      router.refresh();
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "Não foi possível salvar o rascunho.");
    } finally {
      setBusy(false);
    }
  }

  function updateStep(stepId: string, update: (step: WorkflowDefinitionStep) => WorkflowDefinitionStep) {
    setDraftSteps((current) => current.map((step) => step.id === stepId ? update(step) : step));
  }

  if (!definition) {
    return <section className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-600">{message ?? "Carregando definição..."}</section>;
  }

  return <section className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
    <header className="border-b pb-6">
      <p className="text-sm text-slate-500">Revisão {definition.revisionNumber} · {definition.status}</p>
      <h1 className="mt-2 text-3xl font-bold">{definition.name}</h1>
      <div className="mt-4 flex gap-2">
        {definition.status === "draft" ? <button className="bg-brand-600 px-4 py-2 font-semibold text-white" disabled={busy} onClick={() => action("publish")}>Publicar</button> : null}
        {definition.status === "published" ? <>
          <button className="bg-brand-600 px-4 py-2 font-semibold text-white" disabled={busy} onClick={() => action("runs")}>Iniciar execução</button>
          <button className="border px-4 py-2 font-semibold" disabled={busy} onClick={() => action("versions")}>Nova revisão</button>
        </> : null}
        {definition.status !== "archived" ? <button className="border border-rose-300 px-4 py-2 font-semibold text-rose-700" disabled={busy} onClick={archive}>Arquivar</button> : null}
      </div>
    </header>
    {message ? <p aria-live="polite" className="border bg-white p-3 text-sm">{message}</p> : null}
    {definition.status === "draft" ?
      <form className="space-y-4" onSubmit={saveDraft}>
        <label className="block text-sm font-medium">Nome da definição
          <input className="mt-1 h-10 w-full border border-slate-300 px-3" maxLength={255} required value={draftName} onChange={(event) => setDraftName(event.target.value)} />
        </label>
        {draftSteps.map((step) => <fieldset className="space-y-3 border bg-white p-4" key={step.id}>
          <legend className="px-1 text-sm font-semibold">Etapa {step.order}</legend>
          <label className="block text-sm font-medium">Nome
            <input className="mt-1 h-10 w-full border border-slate-300 px-3" maxLength={255} required value={step.name} onChange={(event) => updateStep(step.id, (current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="block text-sm font-medium">Tipo de responsável
            <select className="mt-1 h-10 w-full border border-slate-300 px-3" value={step.assignee.type} onChange={(event) => updateStep(step.id, (current) => ({
              ...current,
              assignee: event.target.value === "user" ? { type: "user", userId: "" } : { type: "role", role: "owner" },
            }))}>
              <option value="role">Papel</option>
              <option value="user">Usuário</option>
            </select>
          </label>
          {step.assignee.type === "role" ?
            <label className="block text-sm font-medium">Papel
              <select className="mt-1 h-10 w-full border border-slate-300 px-3" value={step.assignee.role} onChange={(event) => updateStep(step.id, (current) => ({
                ...current,
                assignee: { type: "role", role: event.target.value as "owner" | "admin" | "editor" | "viewer" },
              }))}>
                <option value="owner">OWNER</option>
                <option value="admin">ADMIN</option>
                <option value="editor">EDITOR</option>
                <option value="viewer">VIEWER</option>
              </select>
            </label> :
            <label className="block text-sm font-medium">ID do usuário
              <input className="mt-1 h-10 w-full border border-slate-300 px-3" required value={step.assignee.userId} onChange={(event) => updateStep(step.id, (current) => ({ ...current, assignee: { type: "user", userId: event.target.value } }))} />
            </label>}
          {step.transitions.map((transition) => <div className="grid gap-3 border-t pt-3 md:grid-cols-3" key={transition.id}>
            <label className="text-sm font-medium">Transição
              <input className="mt-1 h-10 w-full border border-slate-300 px-3" required value={transition.name} onChange={(event) => updateStep(step.id, (current) => ({ ...current, transitions: current.transitions.map((item) => item.id === transition.id ? { ...item, name: event.target.value } : item) }))} />
            </label>
            <label className="text-sm font-medium">Resultado
              <input className="mt-1 h-10 w-full border border-slate-300 px-3" required value={transition.result} onChange={(event) => updateStep(step.id, (current) => ({ ...current, transitions: current.transitions.map((item) => item.id === transition.id ? { ...item, result: event.target.value } : item) }))} />
            </label>
            <label className="text-sm font-medium">Destino
              <select className="mt-1 h-10 w-full border border-slate-300 px-3" disabled={transition.endsWorkflow} value={transition.targetStepId ?? ""} onChange={(event) => updateStep(step.id, (current) => ({ ...current, transitions: current.transitions.map((item) => item.id === transition.id ? { ...item, targetStepId: event.target.value || undefined } : item) }))}>
                <option value="">Sem destino</option>
                {draftSteps.filter((candidate) => candidate.id !== step.id).map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.name}</option>)}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input checked={transition.endsWorkflow} type="checkbox" onChange={(event) => updateStep(step.id, (current) => ({ ...current, transitions: current.transitions.map((item) => item.id === transition.id ? { ...item, endsWorkflow: event.target.checked, targetStepId: event.target.checked ? undefined : item.targetStepId } : item) }))} />
              Encerrar workflow
            </label>
            <button className="justify-self-start text-sm font-semibold text-rose-700" onClick={() => updateStep(step.id, (current) => ({ ...current, transitions: current.transitions.filter((item) => item.id !== transition.id) }))} type="button">Remover transição</button>
          </div>)}
          <button className="text-sm font-semibold text-brand-700" onClick={() => updateStep(step.id, (current) => ({ ...current, transitions: [...current.transitions, { id: crypto.randomUUID(), name: "Novo resultado", result: `result_${current.transitions.length + 1}`, endsWorkflow: false }] }))} type="button">Adicionar transição</button>
        </fieldset>)}
        <button className="bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={busy}>{busy ? "Salvando..." : "Salvar rascunho"}</button>
      </form> :
      <ol className="space-y-3">{definition.steps.map((step) => <li className="border bg-white p-4" key={step.id}>
        <p className="font-semibold">{step.order}. {step.name}</p>
        <p className="mt-1 text-sm text-slate-600">Responsável: {step.assignee.type === "role" ? step.assignee.role : step.assignee.userId}</p>
        <p className="mt-1 text-xs text-slate-500">{step.transitions.map((transition) => `${transition.result} → ${transition.endsWorkflow ? "encerrar" : transition.targetStepId}`).join(" · ")}</p>
      </li>)}</ol>}
    {definition.status === "draft" ? <WorkflowDefinitionFormEditor definitionId={definition.id} initialFields={definition.form} /> :
      <section className="border-t pt-6"><h2 className="text-xl font-bold">Formulário</h2><p className="text-sm text-slate-600">{definition.form.length} campo(s) no snapshot da revisão.</p></section>}
  </section>;
}

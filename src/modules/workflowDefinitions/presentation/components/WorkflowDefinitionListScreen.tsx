"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { WorkflowDefinition } from "@/modules/workflowDefinitions/domain/workflowDefinition";

export function WorkflowDefinitionListScreen() {
  const [definitions, setDefinitions] = useState<ReadonlyArray<WorkflowDefinition>>([]);
  const [name, setName] = useState("");
  const [stepNames, setStepNames] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/workflow-definitions");
    const body = await response.json();
    if (!response.ok) throw new Error(body.message);
    setDefinitions(body.definitions);
  }, []);

  useEffect(() => { load().catch(() => setError("Não foi possível carregar as definições.")); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const names = stepNames.split(",").map((item) => item.trim()).filter(Boolean);
      const ids = names.map(() => crypto.randomUUID());
      const steps = names.map((stepName, index) => ({
        id: ids[index],
        name: stepName,
        order: index + 1,
        assignee: { type: "role", role: "owner" },
        transitions: [{
          id: crypto.randomUUID(),
          name: index === names.length - 1 ? "Finalizar" : "Continuar",
          result: "completed",
          targetStepId: ids[index + 1],
          endsWorkflow: index === names.length - 1,
        }],
      }));
      const response = await fetch("/api/workflow-definitions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, steps }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      setName("");
      setStepNames("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Não foi possível criar a definição.");
    } finally { setBusy(false); }
  }

  return <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
    <header className="border-b border-slate-200 pb-6">
      <h1 className="text-3xl font-bold text-slate-950">Definições de workflow</h1>
      <p className="mt-2 text-sm text-slate-600">Publique processos reutilizáveis e inicie execuções independentes.</p>
    </header>
    <form className="grid gap-3 border border-slate-200 bg-white p-5 md:grid-cols-[1fr_2fr_auto]" onSubmit={submit}>
      <label className="text-sm font-medium">Nome<input className="mt-1 h-10 w-full border border-slate-300 px-3" maxLength={255} onChange={(event) => setName(event.target.value)} required value={name} /></label>
      <label className="text-sm font-medium">Etapas, separadas por vírgula<input className="mt-1 h-10 w-full border border-slate-300 px-3" onChange={(event) => setStepNames(event.target.value)} placeholder="Análise, Aprovação, Finalização" required value={stepNames} /></label>
      <button className="self-end bg-brand-600 px-4 py-2 font-semibold text-white disabled:opacity-60" disabled={busy}>{busy ? "Criando..." : "Criar rascunho"}</button>
    </form>
    {error ? <p aria-live="polite" className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    <div className="overflow-hidden border border-slate-200 bg-white">
      {definitions.length === 0 ? <p className="p-6 text-sm text-slate-600">Nenhuma definição encontrada.</p> :
        <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Definição</th><th>Revisão</th><th>Status</th></tr></thead>
          <tbody>{definitions.map((definition) => <tr className="border-t" key={definition.id}><td className="px-4 py-4"><Link className="font-semibold text-brand-700" href={`/workflow-definitions/${definition.id}`}>{definition.name}</Link></td><td>v{definition.revisionNumber}</td><td>{definition.status}</td></tr>)}</tbody>
        </table>}
    </div>
  </section>;
}

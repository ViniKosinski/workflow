"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import type { WorkflowApiErrorResponse, WorkflowApiResponse, WorkflowFormStep } from "@/modules/workflows/presentation/types/workflowViewModels";
import { Button } from "@/shared/components/ui/Button";

function createStep(name = ""): WorkflowFormStep { return { id: crypto.randomUUID(), name }; }

function Connector({ onAdd }: Readonly<{ onAdd: () => void }>) {
  return <div className="group relative flex h-16 items-center justify-center md:h-auto md:w-20 md:shrink-0">
    <div className="h-full w-px bg-slate-300 md:h-px md:w-full" />
    <span className="absolute bottom-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-slate-400 md:bottom-auto md:right-0 md:border-y-[5px] md:border-l-[7px] md:border-r-0 md:border-y-transparent md:border-l-slate-400" />
    <button aria-label="Adicionar etapa nesta posição" className="absolute flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-600 opacity-100 shadow-sm transition hover:border-brand-500 hover:text-brand-700 md:opacity-0 md:group-hover:opacity-100" onClick={onAdd} type="button">+</button>
  </div>;
}

export function WorkflowForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<WorkflowFormStep[]>([createStep("Primeira atividade")]);
  const [selectedId, setSelectedId] = useState<string | null>(steps[0].id);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedIndex = steps.findIndex((step) => step.id === selectedId);
  const selected = selectedIndex >= 0 ? steps[selectedIndex] : null;
  const completedNames = useMemo(() => steps.filter((step) => step.name.trim()).length, [steps]);

  function insertStep(index: number) { const step = createStep(`Atividade ${steps.length + 1}`); setSteps((current) => [...current.slice(0, index), step, ...current.slice(index)]); setSelectedId(step.id); }
  function updateSelected(value: string) { if (selected) setSteps((current) => current.map((step) => step.id === selected.id ? { ...step, name: value } : step)); }
  function move(direction: -1 | 1) { if (!selected) return; const target = selectedIndex + direction; if (target < 0 || target >= steps.length) return; setSteps((current) => { const next = [...current]; [next[selectedIndex], next[target]] = [next[target], next[selectedIndex]]; return next; }); }
  function removeSelected() { if (!selected || steps.length === 1) return; const next = steps.filter((step) => step.id !== selected.id); setSteps(next); setSelectedId(next[Math.min(selectedIndex, next.length - 1)].id); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    if (!name.trim()) { setError("Dê um nome ao fluxo antes de continuar."); return; }
    if (steps.some((step) => !step.name.trim())) { setError("Todas as atividades precisam de um nome."); return; }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, steps: steps.map((step, index) => ({ name: step.name, order: index + 1 })) }) });
      const payload = await response.json().catch(() => ({})) as WorkflowApiResponse | WorkflowApiErrorResponse;
      if (!response.ok || !("workflow" in payload)) { setError("message" in payload && payload.message ? payload.message : "Não foi possível criar o fluxo."); return; }
      router.push(`/workflows/${payload.workflow.id}`); router.refresh();
    } catch { setError("Não foi possível conectar ao servidor."); }
    finally { setIsSubmitting(false); }
  }

  return <form className="space-y-5" onSubmit={handleSubmit}>
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><label className="flex-1 text-sm font-semibold text-slate-700" htmlFor="name">Nome do fluxo<input autoFocus className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" id="name" onChange={(event) => setName(event.target.value)} placeholder="Ex.: Entrada de novo cliente" required type="text" value={name} /></label><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">{completedNames}/{steps.length} atividades nomeadas</span><Button className="bg-slate-900 hover:bg-slate-800" onClick={() => insertStep(steps.length)} type="button">+ Nova atividade</Button></div></div></section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold text-slate-950">Mapa do processo</h2><p className="mt-1 text-xs text-slate-500">Selecione uma atividade para configurá-la. Use o + para inserir etapas.</p></div><div className="flex gap-2 text-xs text-slate-500"><span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">Início</span><span className="rounded bg-amber-50 px-2 py-1 text-amber-700">Atividade</span><span className="rounded bg-slate-100 px-2 py-1">Fim</span></div></header>
        <div className="min-h-[430px] overflow-auto p-6 sm:p-10" style={{ backgroundColor: "#f8fafc", backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)", backgroundSize: "24px 24px" }}><div className="mx-auto flex min-w-0 flex-col items-center justify-center md:min-h-[340px] md:w-max md:min-w-full md:flex-row">
          <div className="flex h-24 w-44 shrink-0 items-center justify-center rounded-[2rem] border-2 border-emerald-400 bg-emerald-100 px-4 text-center shadow-sm"><div><span className="text-xs font-bold uppercase tracking-wide text-emerald-700">Início</span><p className="mt-1 text-sm font-semibold text-slate-900">Fluxo iniciado</p></div></div>
          {steps.map((step, index) => <div className="contents" key={step.id}><Connector onAdd={() => insertStep(index)} /><button aria-label={`Configurar etapa ${index + 1}: ${step.name || "Sem nome"}`} className={`relative flex h-32 w-56 shrink-0 flex-col justify-between rounded-2xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedId === step.id ? "border-brand-600 bg-white ring-4 ring-brand-100" : "border-amber-300 bg-amber-50"}`} onClick={() => setSelectedId(step.id)} type="button"><span className="absolute -top-3 left-4 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{index + 1}</span><div><span className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Atividade</span><p className={`mt-2 line-clamp-2 font-bold ${step.name.trim() ? "text-slate-950" : "text-rose-600"}`}>{step.name.trim() || "Nome obrigatório"}</p></div><p className="text-xs text-slate-500">Clique para configurar</p></button></div>)}
          <Connector onAdd={() => insertStep(steps.length)} /><div className="flex h-24 w-24 shrink-0 rotate-45 items-center justify-center rounded-2xl border-2 border-slate-400 bg-slate-200 shadow-sm"><div className="-rotate-45 text-center"><span className="text-xs font-bold uppercase text-slate-600">Fim</span></div></div>
        </div></div>
      </section>

      <aside className="self-start rounded-xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-5"><div className="border-b border-slate-200 p-5"><p className="text-xs font-bold uppercase tracking-wide text-brand-700">Configuração</p><h2 className="mt-1 text-lg font-bold">{selected ? `Atividade ${selectedIndex + 1}` : "Selecione um nó"}</h2></div>{selected ? <div className="space-y-5 p-5"><label className="block text-sm font-semibold text-slate-700">Nome da atividade<input className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" onChange={(event) => updateSelected(event.target.value)} placeholder="Ex.: Conferir pagamento" value={selected.name} /></label><div><p className="text-sm font-semibold text-slate-700">Posição no processo</p><div className="mt-2 grid grid-cols-2 gap-2"><button className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-40" disabled={selectedIndex === 0} onClick={() => move(-1)} type="button">← Anterior</button><button className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-40" disabled={selectedIndex === steps.length - 1} onClick={() => move(1)} type="button">Próxima →</button></div></div><div className="rounded-lg bg-sky-50 p-4 text-xs leading-5 text-sky-800"><strong>Próximo passo:</strong> depois de criar, você poderá configurar responsáveis, resultados e caminhos alternativos desta atividade.</div><button className="w-full rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-40" disabled={steps.length === 1} onClick={removeSelected} type="button">Remover atividade</button></div> : <p className="p-5 text-sm text-slate-500">Clique em uma atividade no quadro para editar.</p>}</aside>
    </div>

    {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">O fluxo será criado como rascunho para você completar responsáveis e resultados.</p><Button className="px-6" disabled={isSubmitting} type="submit">{isSubmitting ? "Criando..." : "Criar fluxo visual"}</Button></div>
  </form>;
}

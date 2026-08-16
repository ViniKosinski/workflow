"use client";

import { useRouter } from "next/navigation";
import { FormEvent, PointerEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { WorkflowApiErrorResponse, WorkflowApiResponse, WorkflowFormOutcome, WorkflowFormStep } from "@/modules/workflows/presentation/types/workflowViewModels";
import { Button } from "@/shared/components/ui/Button";

const newOutcome = (): WorkflowFormOutcome => ({ id: crypto.randomUUID(), name: "Concluir", targetStepId: null });
const newStep = (name = ""): WorkflowFormStep => ({ id: crypto.randomUUID(), name, outcomes: [newOutcome()] });
type AvailableWorkflow = { id: string; name: string; steps: ReadonlyArray<{ id: string; name: string }> };
type Point = { x: number; y: number };
type ConnectionPath = { id: string; from: Point; to: Point; external: boolean };
const externalLink = (workflowId: string, stepId: string) => `workflow-link:${workflowId}:${stepId}`;
function resultKey(name: string, index: number) { const key = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); return `${key || "resultado"}_${index + 1}`; }

function Connector({ onAdd }: Readonly<{ onAdd: () => void }>) {
  return <div className="group relative flex h-14 items-center justify-center md:h-auto md:w-16 md:shrink-0"><div className="h-full w-px bg-slate-300 md:h-px md:w-full" /><span className="absolute bottom-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-slate-400 md:bottom-auto md:right-0 md:border-y-[5px] md:border-l-[7px] md:border-r-0 md:border-y-transparent md:border-l-slate-400" /><button aria-label="Adicionar etapa nesta posição" className="absolute flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-600 shadow-sm hover:border-brand-500 hover:text-brand-700 md:opacity-0 md:group-hover:opacity-100" onClick={onAdd} type="button">+</button></div>;
}

export function WorkflowForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<WorkflowFormStep[]>([newStep("Primeira atividade")]);
  const [selectedId, setSelectedId] = useState<string | null>(steps[0].id);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableWorkflows, setAvailableWorkflows] = useState<AvailableWorkflow[]>([]);
  const [loadingExample, setLoadingExample] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const [linkDrag, setLinkDrag] = useState<{ stepId: string; outcomeId: string; from: Point; to: Point } | null>(null);
  const [connectionPaths, setConnectionPaths] = useState<ConnectionPath[]>([]);
  const [zoom, setZoom] = useState(100);
  const selectedIndex = steps.findIndex((step) => step.id === selectedId);
  const selected = selectedIndex >= 0 ? steps[selectedIndex] : null;
  const completedNames = useMemo(() => steps.filter((step) => step.name.trim()).length, [steps]);

  useEffect(() => { void fetch("/api/workflows").then((response) => response.ok ? response.json() : { workflows: [] }).then((payload) => setAvailableWorkflows(payload.workflows ?? [])).catch(() => undefined); }, []);
  useLayoutEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const measure = () => {
      const canvasRect = canvas.getBoundingClientRect();
      const point = (element: Element, side: "left" | "right"): Point => { const rect = element.getBoundingClientRect(); return { x: rect[side] - canvasRect.left + canvas.scrollLeft, y: rect.top + rect.height / 2 - canvasRect.top + canvas.scrollTop }; };
      setConnectionPaths(steps.flatMap((step) => step.outcomes.flatMap((outcome) => {
        const source = canvas.querySelector(`[data-outcome-id="${outcome.id}"]`); if (!source) return [];
        const target = outcome.targetStepId ? canvas.querySelector(`[data-step-id="${outcome.targetStepId}"]`) : !outcome.externalWorkflowId ? canvas.querySelector("[data-end-node]") : null;
        if (!target) return [];
        return [{ id: outcome.id, from: point(source, "right"), to: point(target, "left"), external: false }];
      })));
    };
    measure(); const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure); observer?.observe(canvas); window.addEventListener("resize", measure); return () => { observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [steps, availableWorkflows, zoom]);

  useEffect(() => {
    if (!linkDrag) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const move = (event: globalThis.PointerEvent) => { const rect = canvas.getBoundingClientRect(); setLinkDrag((current) => current ? { ...current, to: { x: event.clientX - rect.left + canvas.scrollLeft, y: event.clientY - rect.top + canvas.scrollTop } } : null); };
    const finish = (event: globalThis.PointerEvent) => {
      const target = document.elementFromPoint?.(event.clientX, event.clientY) as HTMLElement | null;
      const targetStep = target?.closest<HTMLElement>("[data-step-id]")?.dataset.stepId;
      const ends = Boolean(target?.closest("[data-end-node]"));
      if (targetStep && targetStep !== linkDrag.stepId) updateOutcomeForStep(linkDrag.stepId, linkDrag.outcomeId, { targetStepId: targetStep, externalWorkflowId: undefined, externalStepId: undefined });
      else if (ends) updateOutcomeForStep(linkDrag.stepId, linkDrag.outcomeId, { targetStepId: null, externalWorkflowId: undefined, externalStepId: undefined });
      setLinkDrag(null);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish, { once: true }); return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); };
  }, [linkDrag]);

  function insertStep(index: number) { const step = newStep(`Atividade ${steps.length + 1}`); setSteps((current) => [...current.slice(0, index), step, ...current.slice(index)]); setSelectedId(step.id); }
  function updateSelected(patch: Partial<WorkflowFormStep>) { if (selected) setSteps((current) => current.map((step) => step.id === selected.id ? { ...step, ...patch } : step)); }
  function updateOutcome(id: string, patch: Partial<WorkflowFormOutcome>) { if (selected) updateSelected({ outcomes: selected.outcomes.map((outcome) => outcome.id === id ? { ...outcome, ...patch } : outcome) }); }
  function updateOutcomeForStep(stepId: string, outcomeId: string, patch: Partial<WorkflowFormOutcome>) { setSteps((current) => current.map((step) => step.id === stepId ? { ...step, outcomes: step.outcomes.map((outcome) => outcome.id === outcomeId ? { ...outcome, ...patch } : outcome) } : step)); }
  function addOutcome() { if (selected) updateSelected({ outcomes: [...selected.outcomes, { ...newOutcome(), name: `Resultado ${selected.outcomes.length + 1}` }] }); }
  function removeOutcome(id: string) { if (selected && selected.outcomes.length > 1) updateSelected({ outcomes: selected.outcomes.filter((outcome) => outcome.id !== id) }); }
  function move(direction: -1 | 1) { if (!selected) return; const target = selectedIndex + direction; if (target < 0 || target >= steps.length) return; setSteps((current) => { const next = [...current]; [next[selectedIndex], next[target]] = [next[target], next[selectedIndex]]; return next; }); }
  function removeSelected() { if (!selected || steps.length === 1) return; const next = steps.filter((step) => step.id !== selected.id).map((step) => ({ ...step, outcomes: step.outcomes.map((outcome) => outcome.targetStepId === selected.id ? { ...outcome, targetStepId: null } : outcome) })); setSteps(next); setSelectedId(next[Math.min(selectedIndex, next.length - 1)].id); }
  function destinationValue(outcome: WorkflowFormOutcome) { return outcome.externalWorkflowId && outcome.externalStepId ? `external:${outcome.externalWorkflowId}:${outcome.externalStepId}` : outcome.targetStepId ? `local:${outcome.targetStepId}` : "end"; }
  function changeDestination(outcomeId: string, value: string) {
    if (value.startsWith("local:")) updateOutcome(outcomeId, { targetStepId: value.slice(6), externalWorkflowId: undefined, externalStepId: undefined });
    else if (value.startsWith("external:")) { const [, workflowId, stepId] = value.split(":"); updateOutcome(outcomeId, { targetStepId: null, externalWorkflowId: workflowId, externalStepId: stepId }); }
    else updateOutcome(outcomeId, { targetStepId: null, externalWorkflowId: undefined, externalStepId: undefined });
  }
  function destinationLabel(outcome: WorkflowFormOutcome) { if (outcome.externalWorkflowId) return availableWorkflows.find((flow) => flow.id === outcome.externalWorkflowId)?.name ?? "Outro fluxo"; return outcome.targetStepId ? steps.find((step) => step.id === outcome.targetStepId)?.name : "Fim"; }
  function panStart(event: PointerEvent<HTMLDivElement>) { if ((event.target as HTMLElement).closest("button, input, select, label")) return; const canvas = canvasRef.current; if (!canvas) return; drag.current = { x: event.clientX, y: event.clientY, left: canvas.scrollLeft, top: canvas.scrollTop }; canvas.setPointerCapture(event.pointerId); }
  function panMove(event: PointerEvent<HTMLDivElement>) { const canvas = canvasRef.current; if (!canvas || !drag.current) return; canvas.scrollLeft = drag.current.left - (event.clientX - drag.current.x); canvas.scrollTop = drag.current.top - (event.clientY - drag.current.y); }
  function panEnd(event: PointerEvent<HTMLDivElement>) { const canvas = canvasRef.current; if (drag.current && canvas?.releasePointerCapture) canvas.releasePointerCapture(event.pointerId); drag.current = null; }
  function beginLink(event: PointerEvent<HTMLElement>, stepId: string, outcomeId: string) { event.preventDefault(); event.stopPropagation(); const canvas = canvasRef.current; const source = event.currentTarget; if (!canvas) return; const canvasRect = canvas.getBoundingClientRect(); const rect = source.getBoundingClientRect(); const from = { x: rect.right - canvasRect.left + canvas.scrollLeft, y: rect.top + rect.height / 2 - canvasRect.top + canvas.scrollTop }; setLinkDrag({ stepId, outcomeId, from, to: from }); }
  function changeZoom(delta: number) { setZoom((current) => Math.min(125, Math.max(35, current + delta))); }
  function fitFlow() { const canvas = canvasRef.current; if (!canvas) return; const estimatedWidth = 176 + steps.length * 304 + 120; setZoom(Math.round(Math.min(100, Math.max(35, ((canvas.clientWidth - 48) / estimatedWidth) * 100)))); canvas.scrollTo?.({ left: 0, top: 0, behavior: "smooth" }); }
  async function loadExample() {
    setLoadingExample(true); setError(null);
    try {
      const cancellationResponse = await fetch("/api/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Rescisão - Exemplo", steps: ["Levantar informações", "CS entra em contato", "Tentar reverter", "Formalizar rescisão"].map((stepName, index, all) => ({ name: stepName, order: index + 1, transitions: [{ name: index === all.length - 1 ? "Rescisão formalizada" : "Continuar", result: `continue_${index + 1}`, endsWorkflow: index === all.length - 1, ...(index < all.length - 1 ? { targetStepOrder: index + 2 } : {}) }] })) }) });
      const cancellationPayload = await cancellationResponse.json() as WorkflowApiResponse | WorkflowApiErrorResponse;
      if (!cancellationResponse.ok || !("workflow" in cancellationPayload)) throw new Error("Não foi possível criar o fluxo de rescisão.");
      const cancellation = cancellationPayload.workflow;
      const sample = [newStep("Recebimento do PIX"), newStep("Geração do contrato"), newStep("Faturamento"), newStep("Início da implantação")];
      sample[0].outcomes = [{ ...newOutcome(), name: "Pagamento confirmado", targetStepId: sample[1].id }, { ...newOutcome(), name: "Não faturado", externalWorkflowId: cancellation.id, externalStepId: cancellation.steps[1].id, targetStepId: null }];
      sample[1].outcomes = [{ ...newOutcome(), name: "Contrato gerado", targetStepId: sample[2].id }, { ...newOutcome(), name: "Cliente desistiu", externalWorkflowId: cancellation.id, externalStepId: cancellation.steps[1].id, targetStepId: null }];
      sample[2].outcomes = [{ ...newOutcome(), name: "Faturado", targetStepId: sample[3].id }, { ...newOutcome(), name: "Não faturado", externalWorkflowId: cancellation.id, externalStepId: cancellation.steps[1].id, targetStepId: null }];
      sample[3].outcomes = [{ ...newOutcome(), name: "Implantação iniciada" }];
      setAvailableWorkflows((current) => [...current.filter((flow) => flow.id !== cancellation.id), cancellation]); setName("Novo cliente - Exemplo"); setSteps(sample); setSelectedId(sample[0].id);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível carregar o exemplo."); } finally { setLoadingExample(false); }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null);
    if (!name.trim()) { setError("Dê um nome ao fluxo antes de continuar."); return; }
    if (steps.some((step) => !step.name.trim())) { setError("Todas as atividades precisam de um nome."); return; }
    if (steps.some((step) => step.outcomes.some((outcome) => !outcome.name.trim()))) { setError("Todos os tipos de conclusão precisam de um nome."); return; }
    setIsSubmitting(true);
    try {
      const body = { name, steps: steps.map((step, index) => ({ name: step.name, order: index + 1, transitions: step.outcomes.map((outcome, outcomeIndex) => ({ name: outcome.name, result: resultKey(outcome.name, outcomeIndex), description: outcome.externalWorkflowId && outcome.externalStepId ? externalLink(outcome.externalWorkflowId, outcome.externalStepId) : undefined, endsWorkflow: outcome.targetStepId === null, ...(outcome.targetStepId ? { targetStepOrder: steps.findIndex((candidate) => candidate.id === outcome.targetStepId) + 1 } : {}) })) })) };
      const response = await fetch("/api/workflows", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const payload = await response.json().catch(() => ({})) as WorkflowApiResponse | WorkflowApiErrorResponse;
      if (!response.ok || !("workflow" in payload)) { setError("message" in payload && payload.message ? payload.message : "Não foi possível criar o fluxo."); return; }
      router.push(`/workflows/${payload.workflow.id}`); router.refresh();
    } catch { setError("Não foi possível conectar ao servidor."); } finally { setIsSubmitting(false); }
  }

  return <form className="space-y-5" onSubmit={handleSubmit}>
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><label className="flex-1 text-sm font-semibold text-slate-700" htmlFor="name">Nome do fluxo<input autoFocus className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" id="name" onChange={(event) => setName(event.target.value)} placeholder="Ex.: Entrada de novo cliente" required type="text" value={name} /></label><div className="flex flex-wrap items-center gap-3"><span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">{completedNames}/{steps.length} atividades nomeadas</span><Button className="border border-violet-200 bg-white text-violet-700 hover:bg-violet-50" disabled={loadingExample} onClick={() => void loadExample()} type="button">{loadingExample ? "Criando exemplo..." : "Usar exemplo completo"}</Button><Button className="bg-slate-900 hover:bg-slate-800" onClick={() => insertStep(steps.length)} type="button">+ Nova atividade</Button></div></div></section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="font-bold text-slate-950">Mapa do processo</h2><p className="mt-1 text-xs text-slate-500">Arraste a área vazia para navegar e use o zoom para visualizar o fluxo completo.</p></div><div className="flex flex-wrap items-center gap-2 text-xs"><div aria-label="Controles de zoom" className="mr-2 flex items-center overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm"><button aria-label="Diminuir zoom" className="h-8 w-8 text-base font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30" disabled={zoom <= 35} onClick={() => changeZoom(-10)} type="button">−</button><span className="min-w-12 border-x border-slate-200 px-2 text-center font-bold text-slate-700">{zoom}%</span><button aria-label="Aumentar zoom" className="h-8 w-8 text-base font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30" disabled={zoom >= 125} onClick={() => changeZoom(10)} type="button">+</button><button className="h-8 border-l border-slate-200 px-3 font-semibold text-brand-700 hover:bg-brand-50" onClick={fitFlow} type="button">Ajustar</button></div><span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">Início</span><span className="rounded bg-amber-50 px-2 py-1 text-amber-700">Atividade</span><span className="rounded bg-violet-50 px-2 py-1 text-violet-700">Resultados</span></div></header>
        <div className="relative min-h-[470px] cursor-grab touch-none select-none overflow-auto p-6 active:cursor-grabbing sm:p-10" onPointerCancel={panEnd} onPointerDown={panStart} onPointerMove={panMove} onPointerUp={panEnd} ref={canvasRef} style={{ backgroundColor: "#f8fafc", backgroundImage: "linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)", backgroundSize: "24px 24px" }}><svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-10 h-full min-h-[470px] w-full min-w-[2400px] overflow-visible"><defs><marker id="flow-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4"><path d="M0,0 L8,4 L0,8 Z" fill="#7c3aed" /></marker></defs>{connectionPaths.map((path) => { const bend = Math.max(50, Math.abs(path.to.x - path.from.x) / 2); return <path d={`M ${path.from.x} ${path.from.y} C ${path.from.x + bend} ${path.from.y}, ${path.to.x - bend} ${path.to.y}, ${path.to.x} ${path.to.y}`} fill="none" key={path.id} markerEnd="url(#flow-arrow)" stroke="#7c3aed" strokeWidth="2.5" />; })}{linkDrag ? <path d={`M ${linkDrag.from.x} ${linkDrag.from.y} C ${linkDrag.from.x + 70} ${linkDrag.from.y}, ${linkDrag.to.x - 70} ${linkDrag.to.y}, ${linkDrag.to.x} ${linkDrag.to.y}`} fill="none" markerEnd="url(#flow-arrow)" stroke="#0891b2" strokeDasharray="7 5" strokeWidth="3" /> : null}</svg><div className="relative z-20 mx-auto flex min-w-0 flex-col items-center justify-center transition-[zoom] duration-150 md:min-h-[380px] md:w-max md:min-w-full md:flex-row" style={{ zoom: zoom / 100 }}>
          <div className="flex h-24 w-44 shrink-0 items-center justify-center rounded-[2rem] border-2 border-emerald-400 bg-emerald-100 px-4 text-center shadow-sm"><div><span className="text-xs font-bold uppercase tracking-wide text-emerald-700">Início</span><p className="mt-1 text-sm font-semibold text-slate-900">Fluxo iniciado</p></div></div>
          {steps.map((step, index) => <div className="contents" key={step.id}><Connector onAdd={() => insertStep(index)} /><button aria-label={`Configurar etapa ${index + 1}: ${step.name || "Sem nome"}`} className={`relative flex min-h-40 w-60 shrink-0 flex-col rounded-2xl border-2 p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${selectedId === step.id ? "border-brand-600 bg-white ring-4 ring-brand-100" : "border-amber-300 bg-amber-50"}`} data-step-id={step.id} onClick={() => setSelectedId(step.id)} type="button"><span className="absolute -top-3 left-4 rounded-full bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">{index + 1}</span><span className="text-[11px] font-bold uppercase tracking-wide text-amber-700">Atividade</span><p className={`mt-2 line-clamp-2 font-bold ${step.name.trim() ? "text-slate-950" : "text-rose-600"}`}>{step.name.trim() || "Nome obrigatório"}</p><div className="mt-4 space-y-1.5 border-t border-amber-200 pt-3">{step.outcomes.map((outcome) => <div className={`relative flex items-center gap-2 rounded-md px-2 py-1.5 pr-5 text-xs ${outcome.externalWorkflowId ? "bg-sky-100 text-sky-800" : "bg-violet-50 text-violet-800"}`} data-outcome-id={outcome.id} key={outcome.id}><span className="font-bold">↳</span><span className="min-w-0 flex-1 truncate">{outcome.name || "Sem nome"}</span><span className="max-w-20 truncate text-[10px]">{destinationLabel(outcome)}</span><span aria-label={`Ligar resultado ${outcome.name || "Sem nome"}`} className="absolute -right-3 top-1/2 z-30 h-5 w-5 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-white bg-violet-600 shadow ring-2 ring-violet-200 hover:scale-125" onPointerDown={(event) => beginLink(event, step.id, outcome.id)} role="button" tabIndex={0} title="Arraste para ligar a outra atividade" /></div>)}</div></button></div>)}
          <Connector onAdd={() => insertStep(steps.length)} /><div className="flex h-24 w-24 shrink-0 rotate-45 items-center justify-center rounded-2xl border-2 border-slate-400 bg-slate-200 shadow-sm" data-end-node><div className="-rotate-45 text-center"><span className="text-xs font-bold uppercase text-slate-600">Fim</span></div></div>
        </div></div>
      </section>
      <aside className="self-start rounded-xl border border-slate-200 bg-white shadow-sm xl:sticky xl:top-5"><div className="border-b border-slate-200 p-5"><p className="text-xs font-bold uppercase tracking-wide text-brand-700">Configuração</p><h2 className="mt-1 text-lg font-bold">{selected ? `Atividade ${selectedIndex + 1}` : "Selecione um nó"}</h2></div>{selected ? <div className="space-y-5 p-5"><label className="block text-sm font-semibold text-slate-700">Nome da atividade<input className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" onChange={(event) => updateSelected({ name: event.target.value })} placeholder="Ex.: Conferir pagamento" value={selected.name} /></label><div><p className="text-sm font-semibold text-slate-700">Posição no processo</p><div className="mt-2 grid grid-cols-2 gap-2"><button className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-40" disabled={selectedIndex === 0} onClick={() => move(-1)} type="button">← Anterior</button><button className="rounded-md border px-3 py-2 text-sm font-semibold disabled:opacity-40" disabled={selectedIndex === steps.length - 1} onClick={() => move(1)} type="button">Próxima →</button></div></div>
          <div><div className="flex items-center justify-between"><div><p className="text-sm font-bold text-slate-800">Tipos de conclusão</p><p className="mt-1 text-xs text-slate-500">Cada opção pode seguir por um caminho diferente.</p></div><button className="rounded-md border border-violet-200 px-2.5 py-1.5 text-xs font-bold text-violet-700" onClick={addOutcome} type="button">+ Resultado</button></div><div className="mt-3 space-y-3">{selected.outcomes.map((outcome, index) => <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3" key={outcome.id}><div className="flex items-center justify-between"><span className="text-xs font-bold uppercase text-violet-700">Resultado {index + 1}</span><button aria-label={`Remover resultado ${index + 1}`} className="text-xs font-semibold text-rose-600 disabled:opacity-30" disabled={selected.outcomes.length === 1} onClick={() => removeOutcome(outcome.id)} type="button">Remover</button></div><label className="mt-2 block text-xs font-semibold text-slate-600">Nome<input aria-label={`Nome do resultado ${index + 1}`} className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2" onChange={(event) => updateOutcome(outcome.id, { name: event.target.value })} placeholder="Ex.: Pagamento confirmado" value={outcome.name} /></label><label className="mt-2 block text-xs font-semibold text-slate-600">Ao concluir<select aria-label={`Destino do resultado ${index + 1}`} className="mt-1 h-9 w-full rounded-md border border-slate-300 bg-white px-2" onChange={(event) => changeDestination(outcome.id, event.target.value)} value={destinationValue(outcome)}><option value="end">Encerrar este fluxo</option><optgroup label="Neste fluxo">{steps.filter((step) => step.id !== selected.id).map((step) => <option key={step.id} value={`local:${step.id}`}>Ir para: {step.name || "Atividade sem nome"}</option>)}</optgroup>{availableWorkflows.length ? <optgroup label="Em outro fluxo">{availableWorkflows.flatMap((flow) => flow.steps.map((step) => <option key={`${flow.id}:${step.id}`} value={`external:${flow.id}:${step.id}`}>{flow.name} → {step.name}</option>))}</optgroup> : null}</select></label>{outcome.externalWorkflowId ? <p className="mt-2 rounded bg-sky-100 px-2 py-1.5 text-[11px] font-semibold text-sky-800">Ligação entre fluxos: esta conclusão encerra o fluxo atual e referencia a etapa escolhida.</p> : null}</div>)}</div></div>
          <button className="w-full rounded-md border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 disabled:opacity-40" disabled={steps.length === 1} onClick={removeSelected} type="button">Remover atividade</button></div> : <p className="p-5 text-sm text-slate-500">Clique em uma atividade no quadro para editar.</p>}</aside>
    </div>
    {error ? <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-500">O fluxo será criado como rascunho com os resultados e caminhos configurados.</p><Button className="px-6" disabled={isSubmitting} type="submit">{isSubmitting ? "Criando..." : "Criar fluxo visual"}</Button></div>
  </form>;
}

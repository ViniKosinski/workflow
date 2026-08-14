"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { TaskPage } from "@/modules/tasks/domain/task";

const emptyPage: TaskPage = { tasks: [], page: 1, pageSize: 10, total: 0, totalPages: 0 };

export function TaskList() {
  const [result, setResult] = useState<TaskPage>(emptyPage);
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [status, setStatus] = useState<"" | "pending" | "running">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const params = new URLSearchParams({ order, page: String(page), pageSize: "10" });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    try {
      const response = await fetch(`/api/tasks?${params}`);
      const data = await response.json() as Partial<TaskPage> & { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Não foi possível carregar as tarefas.");
      setResult({ tasks: data.tasks ?? [], page: data.page ?? 1, pageSize: data.pageSize ?? 10, total: data.total ?? 0, totalPages: data.totalPages ?? 0 });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar as tarefas."); }
    finally { setLoading(false); }
  }, [order, page, search, status]);
  useEffect(() => { void load(); }, [load]);

  return <div className="space-y-5">
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto_auto_auto]" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
      <label className="text-sm font-medium text-slate-700">Buscar<input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" onChange={(event) => setSearchInput(event.target.value)} placeholder="Tarefa ou workflow" value={searchInput} /></label>
      <label className="text-sm font-medium text-slate-700">Status<select className="mt-1 block h-10 rounded-md border border-slate-300 px-3" onChange={(event) => { setPage(1); setStatus(event.target.value as typeof status); }} value={status}><option value="">Pendentes e iniciadas</option><option value="pending">Pendente</option><option value="running">Em andamento</option></select></label>
      <label className="text-sm font-medium text-slate-700">Ordenação<select aria-label="Ordenar por data" className="mt-1 block h-10 rounded-md border border-slate-300 px-3" onChange={(event) => { setPage(1); setOrder(event.target.value as "asc" | "desc"); }} value={order}><option value="desc">Mais recentes</option><option value="asc">Mais antigas</option></select></label>
      <button className="self-end rounded-md bg-brand-600 px-4 py-2 font-semibold text-white" type="submit">Buscar</button>
    </form>
    {loading ? <p className="text-sm text-slate-600">Carregando sua fila...</p> : null}
    {error ? <div className="rounded-md bg-rose-50 p-4 text-sm text-rose-700"><p>{error}</p><button className="mt-2 font-semibold underline" onClick={() => void load()} type="button">Tentar novamente</button></div> : null}
    {!loading && !error && result.tasks.length === 0 ? <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">Nenhuma tarefa encontrada para os filtros selecionados.</div> : null}
    {!loading && !error && result.tasks.length > 0 ? <><p className="text-sm text-slate-500">{result.total} {result.total === 1 ? "tarefa encontrada" : "tarefas encontradas"}</p><ul className="grid gap-4">{result.tasks.map((task) => <li key={task.id}><Link className="block rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-400" href={`/tasks/${task.id}`}><div className="flex justify-between gap-4"><strong>{task.stepName}</strong><span className={`rounded-full px-2 py-1 text-xs font-semibold ${task.status === "running" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>{task.status === "running" ? "Em andamento" : "Pendente"}</span></div><p className="mt-2 text-sm text-slate-600">{task.workflowName} · {task.organizationName}</p><p className="mt-1 text-xs text-slate-500">Responsável: {task.assigneeName} · Criada em {new Date(task.createdAt).toLocaleString("pt-BR")}</p></Link></li>)}</ul><nav aria-label="Paginação da fila" className="flex items-center justify-between"><button className="rounded-md border px-3 py-2 text-sm disabled:opacity-40" disabled={result.page <= 1} onClick={() => setPage((current) => current - 1)} type="button">Anterior</button><span className="text-sm text-slate-600">Página {result.page} de {Math.max(1, result.totalPages)}</span><button className="rounded-md border px-3 py-2 text-sm disabled:opacity-40" disabled={result.page >= result.totalPages} onClick={() => setPage((current) => current + 1)} type="button">Próxima</button></nav></> : null}
  </div>;
}

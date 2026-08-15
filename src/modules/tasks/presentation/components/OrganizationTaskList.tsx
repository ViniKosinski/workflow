"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useActiveOrganization } from "@/modules/organizations/presentation/components/ActiveOrganizationProvider";
import type { TaskPage } from "@/modules/tasks/domain/task";

const emptyPage: TaskPage = { tasks: [], page: 1, pageSize: 10, total: 0, totalPages: 0 };
const statusLabel = { pending: "Pendente", running: "Em andamento", completed: "Concluída", failed: "Falhou", skipped: "Ignorada" } as const;

export function OrganizationTaskList() {
  const { organizations, activeId } = useActiveOrganization();
  const [result, setResult] = useState<TaskPage>(emptyPage);
  const [status, setStatus] = useState<"" | "pending" | "running" | "completed">("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const params = new URLSearchParams({ organizationId: activeId, order: "desc", page: String(page), pageSize: "10" });
    if (status) params.set("status", status);
    if (search) params.set("search", search);
    try {
      const response = await fetch(`/api/tasks/organization?${params}`);
      const data = await response.json() as Partial<TaskPage> & { message?: string };
      if (!response.ok) throw new Error(data.message ?? "Não foi possível carregar as tarefas da organização.");
      setResult({ tasks: data.tasks ?? [], page: data.page ?? 1, pageSize: data.pageSize ?? 10, total: data.total ?? 0, totalPages: data.totalPages ?? 0 });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível carregar as tarefas da organização."); }
    finally { setLoading(false); }
  }, [activeId, page, search, status]);
  useEffect(() => { setPage(1); }, [activeId]);
  useEffect(() => { void load(); }, [load]);

  if (!activeId && organizations.length === 0 && !loading) return <div className="rounded-lg border bg-white p-8 text-center text-slate-600">Você ainda não participa de uma organização.</div>;
  return <div className="space-y-5">
    <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-[1fr_auto_auto]" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
      <label className="text-sm font-medium text-slate-700">Buscar<input className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3" onChange={(event) => setSearchInput(event.target.value)} placeholder="Tarefa, workflow ou responsável" value={searchInput} /></label>
      <label className="text-sm font-medium text-slate-700">Status<select className="mt-1 block h-10 rounded-md border border-slate-300 px-3" onChange={(event) => { setPage(1); setStatus(event.target.value as typeof status); }} value={status}><option value="">Todos</option><option value="pending">Pendente</option><option value="running">Em andamento</option><option value="completed">Concluída</option></select></label>
      <button className="self-end rounded-md bg-brand-600 px-4 py-2 font-semibold text-white" type="submit">Buscar</button>
    </form>
    {loading ? <p className="text-sm text-slate-600">Carregando tarefas da organização...</p> : null}
    {error ? <div className="rounded-md bg-rose-50 p-4 text-sm text-rose-700"><p>{error}</p><button className="mt-2 font-semibold underline" onClick={() => void load()} type="button">Tentar novamente</button></div> : null}
    {!loading && !error && result.tasks.length === 0 ? <div className="rounded-lg border bg-white p-8 text-center text-slate-600">Nenhuma tarefa encontrada para os filtros selecionados.</div> : null}
    {!loading && !error && result.tasks.length > 0 ? <><p className="text-sm text-slate-500">{result.total} {result.total === 1 ? "tarefa encontrada" : "tarefas encontradas"}</p><div className="overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-4">Tarefa</th><th className="p-4">Workflow</th><th className="p-4">Responsável</th><th className="p-4">Status</th><th className="p-4">Atualização</th></tr></thead><tbody>{result.tasks.map((task) => <tr className="border-t border-slate-100 hover:bg-slate-50" key={task.id}><td className="p-4 font-semibold"><Link className="text-brand-700 hover:underline" href={`/tasks/organization/${task.id}?organizationId=${encodeURIComponent(activeId)}`}>{task.stepName}</Link></td><td className="p-4 text-slate-600">{task.workflowName}</td><td className="p-4 text-slate-600">{task.assigneeName}</td><td className="p-4"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold">{statusLabel[task.status]}</span></td><td className="p-4 text-slate-500">{new Date(task.createdAt).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div><nav aria-label="Paginação das tarefas da organização" className="flex items-center justify-between"><button className="rounded-md border px-3 py-2 text-sm disabled:opacity-40" disabled={result.page <= 1} onClick={() => setPage((value) => value - 1)} type="button">Anterior</button><span className="text-sm text-slate-600">Página {result.page} de {Math.max(1, result.totalPages)}</span><button className="rounded-md border px-3 py-2 text-sm disabled:opacity-40" disabled={result.page >= result.totalPages} onClick={() => setPage((value) => value + 1)} type="button">Próxima</button></nav></> : null}
  </div>;
}

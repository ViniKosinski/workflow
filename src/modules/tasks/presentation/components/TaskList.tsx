"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { WorkTask } from "@/modules/tasks/domain/task";

export function TaskList() {
  const [tasks, setTasks] = useState<ReadonlyArray<WorkTask>>([]);
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/tasks?order=${order}`)
      .then(async (response) => {
        const data = await response.json() as { tasks?: WorkTask[]; message?: string };
        if (!response.ok) throw new Error(data.message ?? "Não foi possível carregar as tarefas.");
        if (active) setTasks(data.tasks ?? []);
      })
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [order]);

  if (loading) return <p className="text-sm text-slate-600">Carregando sua fila...</p>;
  if (error) return <div className="rounded-md bg-rose-50 p-4 text-sm text-rose-700">{error}</div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <label className="text-sm text-slate-600">Ordenar por data {" "}
          <select className="rounded-md border border-slate-300 p-2" value={order} onChange={(event) => setOrder(event.target.value as "asc" | "desc")}>
            <option value="desc">Mais recentes</option><option value="asc">Mais antigas</option>
          </select>
        </label>
      </div>
      {tasks.length === 0 ? <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-600">Sua fila está vazia.</div> : (
        <ul className="grid gap-4">
          {tasks.map((task) => <li key={task.id}>
            <Link href={`/tasks/${task.id}`} className="block rounded-lg border border-slate-200 bg-white p-5 hover:border-brand-400">
              <div className="flex justify-between gap-4"><strong>{task.stepName}</strong><span className="text-xs uppercase text-slate-500">Prioridade normal</span></div>
              <p className="mt-2 text-sm text-slate-600">{task.workflowName} · {task.organizationName}</p>
              <p className="mt-1 text-xs text-slate-500">Responsável: {task.assigneeName} · Criada em {new Date(task.createdAt).toLocaleString("pt-BR")}</p>
            </Link>
          </li>)}
        </ul>
      )}
    </div>
  );
}

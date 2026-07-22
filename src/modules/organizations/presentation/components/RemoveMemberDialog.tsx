"use client";

import { useState } from "react";
import { organizationClient } from "@/modules/organizations/presentation/api/organizationClient";

export function RemoveMemberDialog({ organizationId, userId, memberName, onChanged }: Readonly<{ organizationId: string; userId: string; memberName: string; onChanged: () => void }>) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  if (!open) return <button className="text-sm font-semibold text-rose-700" onClick={() => setOpen(true)} type="button">Remover</button>;
  return <div className="flex flex-col items-end gap-2"><p className="text-xs text-slate-600">Remover {memberName}?</p><div className="flex gap-2"><button className="text-sm text-slate-600" disabled={busy} onClick={() => setOpen(false)} type="button">Cancelar</button><button className="text-sm font-semibold text-rose-700" disabled={busy} onClick={async () => { setBusy(true); setError(null); try { await organizationClient.removeMember(organizationId, userId); onChanged(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível remover o membro."); setBusy(false); } }} type="button">{busy ? "Removendo..." : "Confirmar"}</button></div>{error ? <p className="text-xs text-rose-700">{error}</p> : null}</div>;
}

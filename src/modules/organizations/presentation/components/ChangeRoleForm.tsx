"use client";

import { useState } from "react";
import { organizationClient } from "@/modules/organizations/presentation/api/organizationClient";
import type { OrganizationRole } from "@/modules/organizations/presentation/types/organizationViewModels";

export function ChangeRoleForm({ organizationId, userId, currentRole, roles, onChanged }: Readonly<{ organizationId: string; userId: string; currentRole: OrganizationRole; roles: ReadonlyArray<Exclude<OrganizationRole, "owner">>; onChanged: () => void }>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <div><label className="sr-only" htmlFor={`role-${userId}`}>Alterar papel</label><select className="h-9 border border-slate-300 bg-white px-2 text-sm disabled:opacity-60" disabled={busy} id={`role-${userId}`} onChange={async (event) => { const role = event.target.value as OrganizationRole; setBusy(true); setError(null); try { await organizationClient.changeRole(organizationId, userId, role); onChanged(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível alterar o papel."); } finally { setBusy(false); } }} value={currentRole}><option value={currentRole}>{currentRole.toUpperCase()}</option>{roles.map((role) => <option key={role} value={role}>{role.toUpperCase()}</option>)}</select>{error ? <p className="mt-1 max-w-48 text-xs text-rose-700">{error}</p> : null}</div>;
}

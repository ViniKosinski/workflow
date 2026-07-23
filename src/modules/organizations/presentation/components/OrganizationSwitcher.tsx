"use client";

import { useState } from "react";
import { useActiveOrganization } from "@/modules/organizations/presentation/components/ActiveOrganizationProvider";

export function OrganizationSwitcher() {
  const { organizations, activeId, select } = useActiveOrganization();
  const [error, setError] = useState<string | null>(null);
  if (organizations.length === 0) return null;
  return <div>
    <label><span className="sr-only">Organização ativa</span><select aria-label="Organização ativa" className="max-w-44 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm" value={activeId} onChange={(event) => {
      setError(null);
      void select(event.target.value).catch((reason: Error) => setError(reason.message));
    }}>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>
    {error ? <p className="absolute mt-1 max-w-64 rounded bg-rose-50 p-2 text-xs text-rose-700" role="alert">{error}</p> : null}
  </div>;
}

"use client";

import { useActiveOrganization } from "@/modules/organizations/presentation/components/ActiveOrganizationProvider";

export function OrganizationSwitcher() {
  const { organizations, activeId, select } = useActiveOrganization();
  if (organizations.length === 0) return null;
  return <label className="sr-only">Organização ativa<select aria-label="Organização ativa" className="max-w-44 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm" value={activeId} onChange={(event) => void select(event.target.value)}>{organizations.map((organization) => <option key={organization.id} value={organization.id}>{organization.name}</option>)}</select></label>;
}

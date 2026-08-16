"use client";

import { useCallback, useEffect, useState } from "react";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";
import { organizationClient } from "@/modules/organizations/presentation/api/organizationClient";
import type { OrganizationAuthorizationView, OrganizationMemberView, OrganizationRole, OrganizationView } from "@/modules/organizations/presentation/types/organizationViewModels";
import { AddMemberForm } from "@/modules/organizations/presentation/components/AddMemberForm";
import { OrganizationHeader } from "@/modules/organizations/presentation/components/OrganizationHeader";
import { OrganizationMembers } from "@/modules/organizations/presentation/components/OrganizationMembers";
import { OrganizationTeams } from "@/modules/teams/presentation/components/OrganizationTeams";

type State = { organization: OrganizationView; members: OrganizationMemberView[]; authorization: OrganizationAuthorizationView; roles: Exclude<OrganizationRole, "owner">[] };

export function OrganizationDetailsScreen({ organizationId }: Readonly<{ organizationId: string }>) {
  const [state, setState] = useState<State | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); setError(null); try { const [organization, members, authorization, roles] = await Promise.all([organizationClient.get(organizationId), organizationClient.members(organizationId), organizationClient.authorization(organizationId), organizationClient.roles()]); setState({ organization, members, authorization, roles }); } catch (caught) { setError(caught instanceof Error ? caught.message : "Não foi possível carregar a organização."); } finally { setLoading(false); } }, [organizationId]);
  useEffect(() => { void load(); }, [load]);
  if (loading && !state) return <section className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-600">Carregando organização...</section>;
  if (error && !state) return <section className="mx-auto max-w-6xl px-6 py-8"><p className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p></section>;
  if (!state) return null;
  const canAdd = state.authorization.permissions.includes(ORGANIZATION_PERMISSIONS.membershipAdd);
  const canManageTeams = state.authorization.permissions.includes(ORGANIZATION_PERMISSIONS.teamManage);
  return <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8"><OrganizationHeader authorization={state.authorization} organization={state.organization} /><div className="border border-slate-200 bg-white p-5"><h2 className="font-semibold text-slate-950">Suas permissões</h2><p className="mt-2 text-sm text-slate-600">{state.authorization.permissions.join(" · ")}</p></div>{canAdd ? <AddMemberForm onChanged={load} organizationId={organizationId} roles={state.roles} /> : null}{error ? <p className="border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}<OrganizationMembers members={state.members} onChanged={load} /><OrganizationTeams canManage={canManageTeams} organizationId={organizationId} organizationMembers={state.members} /></section>;
}

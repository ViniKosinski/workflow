"use client";

import { useEffect, useState } from "react";
import { organizationClient } from "@/modules/organizations/presentation/api/organizationClient";
import type { OrganizationView } from "@/modules/organizations/presentation/types/organizationViewModels";
import { OrganizationActions } from "@/modules/organizations/presentation/components/OrganizationActions";
import { OrganizationList } from "@/modules/organizations/presentation/components/OrganizationList";

export function OrganizationsScreen() {
  const [organizations, setOrganizations] = useState<OrganizationView[] | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { organizationClient.list().then(setOrganizations).catch((caught) => setError(caught instanceof Error ? caught.message : "Não foi possível carregar as organizações.")); }, []);
  return <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8"><header className="flex items-end justify-between border-b border-slate-200 pb-6"><div><h1 className="text-3xl font-bold text-slate-950">Organizações</h1><p className="mt-2 text-sm text-slate-600">Gerencie espaços de trabalho e colaboradores.</p></div><OrganizationActions /></header>{error ? <p className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p> : organizations ? <OrganizationList organizations={organizations} /> : <p aria-live="polite" className="text-sm text-slate-600">Carregando organizações...</p>}</section>;
}

"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrganizationView } from "@/modules/organizations/presentation/types/organizationViewModels";

type ActiveOrganizationContextValue = Readonly<{
  organizations: ReadonlyArray<OrganizationView>;
  activeId: string;
  select: (id: string) => Promise<void>;
}>;

const ActiveOrganizationContext = createContext<ActiveOrganizationContextValue | null>(null);

export function ActiveOrganizationProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<ReadonlyArray<OrganizationView>>([]);
  const [activeId, setActiveId] = useState("");
  useEffect(() => {
    Promise.all([fetch("/api/organizations").then((response) => response.json()), fetch("/api/organizations/active").then((response) => response.json())])
      .then(([list, active]: [{ organizations?: OrganizationView[] }, { organizationId?: string }]) => {
        setOrganizations(list.organizations ?? []); setActiveId(active.organizationId ?? "");
      }).catch(() => undefined);
  }, []);
  async function select(id: string) {
    const response = await fetch("/api/organizations/active", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ organizationId: id }) });
    if (!response.ok) throw new Error("Não foi possível trocar a organização.");
    setActiveId(id); router.refresh();
  }
  return <ActiveOrganizationContext.Provider value={{ organizations, activeId, select }}>{children}</ActiveOrganizationContext.Provider>;
}

export function useActiveOrganization() {
  const value = useContext(ActiveOrganizationContext);
  if (!value) throw new Error("ActiveOrganizationProvider ausente.");
  return value;
}

import Link from "next/link";
import type { OrganizationAuthorizationView, OrganizationView } from "@/modules/organizations/presentation/types/organizationViewModels";
import { OrganizationRoleBadge } from "@/modules/organizations/presentation/components/OrganizationRoleBadge";

export function OrganizationHeader({ organization, authorization }: Readonly<{ organization: OrganizationView; authorization: OrganizationAuthorizationView }>) {
  return <header className="border-b border-slate-200 pb-6"><Link className="text-sm font-semibold text-brand-700" href="/organizations">← Organizações</Link><div className="mt-4 flex flex-wrap items-center gap-3"><h1 className="text-3xl font-bold text-slate-950">{organization.name}</h1><OrganizationRoleBadge role={authorization.role} /></div><p className="mt-2 text-sm text-slate-600">Criada em {new Date(organization.createdAt).toLocaleDateString("pt-BR")}</p></header>;
}

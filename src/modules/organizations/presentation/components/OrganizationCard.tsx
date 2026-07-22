import Link from "next/link";
import type { OrganizationView } from "@/modules/organizations/presentation/types/organizationViewModels";

export function OrganizationCard({ organization }: Readonly<{ organization: OrganizationView }>) {
  return <Link className="block border border-slate-200 bg-white p-5 transition hover:border-brand-300 hover:shadow-sm" href={`/organizations/${organization.id}`}><h2 className="font-semibold text-slate-950">{organization.name}</h2><p className="mt-2 text-sm text-slate-500">Criada em {new Date(organization.createdAt).toLocaleDateString("pt-BR")}</p></Link>;
}

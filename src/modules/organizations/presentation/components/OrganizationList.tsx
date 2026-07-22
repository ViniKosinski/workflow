import type { OrganizationView } from "@/modules/organizations/presentation/types/organizationViewModels";
import { OrganizationCard } from "@/modules/organizations/presentation/components/OrganizationCard";

export function OrganizationList({ organizations }: Readonly<{ organizations: ReadonlyArray<OrganizationView> }>) {
  if (!organizations.length) return <div className="border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">Você ainda não participa de nenhuma organização.</div>;
  return <div className="grid gap-4 md:grid-cols-2">{organizations.map((organization) => <OrganizationCard key={organization.id} organization={organization} />)}</div>;
}

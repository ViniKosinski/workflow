import type { OrganizationMemberView } from "@/modules/organizations/presentation/types/organizationViewModels";
import { OrganizationMemberRow } from "@/modules/organizations/presentation/components/OrganizationMemberRow";

export function OrganizationMembers({ members, onChanged }: Readonly<{ members: ReadonlyArray<OrganizationMemberView>; onChanged: () => void }>) {
  return <section><h2 className="mb-3 text-xl font-bold text-slate-950">Membros</h2><div className="overflow-x-auto border border-slate-200 bg-white"><table className="min-w-full text-left"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Colaborador</th><th className="px-4 py-3">Papel</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody>{members.map((member) => <OrganizationMemberRow key={member.userId} member={member} onChanged={onChanged} />)}</tbody></table></div></section>;
}

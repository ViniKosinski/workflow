import type { OrganizationMemberView } from "@/modules/organizations/presentation/types/organizationViewModels";
import { ChangeRoleForm } from "@/modules/organizations/presentation/components/ChangeRoleForm";
import { OrganizationRoleBadge } from "@/modules/organizations/presentation/components/OrganizationRoleBadge";
import { RemoveMemberDialog } from "@/modules/organizations/presentation/components/RemoveMemberDialog";

export function OrganizationMemberRow({ member, onChanged }: Readonly<{ member: OrganizationMemberView; onChanged: () => void }>) {
  const name = member.user?.name ?? "Usuário";
  return <tr className="border-t border-slate-100"><td className="px-4 py-4"><p className="font-medium text-slate-900">{name}</p><p className="text-sm text-slate-500">{member.user?.email}</p></td><td className="px-4 py-4"><OrganizationRoleBadge role={member.role} /></td><td className="px-4 py-4"><div className="flex items-start justify-end gap-4">{member.actions.assignableRoles.length ? <ChangeRoleForm currentRole={member.role} onChanged={onChanged} organizationId={member.organizationId} roles={member.actions.assignableRoles} userId={member.userId} /> : null}{member.actions.canRemove ? <RemoveMemberDialog memberName={name} onChanged={onChanged} organizationId={member.organizationId} userId={member.userId} /> : null}{!member.actions.assignableRoles.length && !member.actions.canRemove ? <span className="text-sm text-slate-400">Sem ações disponíveis</span> : null}</div></td></tr>;
}

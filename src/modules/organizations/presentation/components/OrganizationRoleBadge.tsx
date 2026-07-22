import type { OrganizationRole } from "@/modules/organizations/presentation/types/organizationViewModels";

const labels: Record<OrganizationRole, string> = { owner: "Owner", admin: "Admin", editor: "Editor", viewer: "Viewer" };

export function OrganizationRoleBadge({ role }: Readonly<{ role: OrganizationRole }>) {
  return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold uppercase text-slate-700">{labels[role]}</span>;
}

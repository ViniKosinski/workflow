import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";

export function listOrganizations(dependencies: OrganizationApplicationDependencies, actorUserId: string) {
  return dependencies.organizations.listByUserId(actorUserId);
}

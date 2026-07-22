import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";
import { authorizeOrganizationAction } from "@/modules/organizations/application/authorizeOrganizationAction";
import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";
import { OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";

export async function getOrganization(dependencies: OrganizationApplicationDependencies, actorUserId: string, organizationId: string) {
  await authorizeOrganizationAction(dependencies, actorUserId, organizationId, ORGANIZATION_PERMISSIONS.organizationRead);
  const organization = await dependencies.organizations.findById(organizationId);
  if (!organization) throw new OrganizationNotFoundError();
  return organization;
}

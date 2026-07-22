import type { OrganizationApplicationDependencies } from "@/modules/organizations/application/organizationApplicationTypes";
import { ORGANIZATION_ROLES } from "@/modules/organizations/domain/membership";
import { validateOrganizationName } from "@/modules/organizations/domain/organization";

export async function createOrganization(
  dependencies: OrganizationApplicationDependencies,
  actorUserId: string,
  input: Readonly<{ name: string }>,
) {
  const now = dependencies.clock.now().toISOString();
  const organizationId = dependencies.ids.createOrganizationId();
  return dependencies.organizations.createWithOwner({
    organization: {
      id: organizationId,
      name: validateOrganizationName(input.name),
      createdAt: now,
      updatedAt: now,
    },
    ownerMembership: {
      organizationId,
      userId: actorUserId,
      role: ORGANIZATION_ROLES.owner,
      createdAt: now,
      updatedAt: now,
    },
  });
}

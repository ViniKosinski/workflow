import type { OrganizationPermission, OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import { OrganizationNotFoundError } from "@/modules/organizations/application/organizationErrors";
import type { MembershipRepository } from "@/modules/organizations/domain/membershipRepository";

export type OrganizationAuthorizationGuard = Readonly<{
  require: (permission: OrganizationPermission) => Promise<void>;
}>;

export function createOrganizationAuthorizationGuard(
  memberships: MembershipRepository,
  service: OrganizationAuthorizationService,
  actorUserId: string,
  organizationId: string,
): OrganizationAuthorizationGuard {
  return {
    async require(permission) {
      const membership = await memberships.find(organizationId, actorUserId);
      if (!membership) throw new OrganizationNotFoundError();
      service.require(membership.role, permission);
    },
  };
}

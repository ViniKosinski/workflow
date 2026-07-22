import type { OrganizationAuthorizationService } from "@/modules/authorization/domain/authorization";
import type { UserRepository } from "@/modules/auth/domain/userRepository";
import type { MembershipRepository } from "@/modules/organizations/domain/membershipRepository";
import type { OrganizationRepository } from "@/modules/organizations/domain/organizationRepository";

export type OrganizationApplicationDependencies = Readonly<{
  organizations: OrganizationRepository;
  memberships: MembershipRepository;
  users: UserRepository;
  authorization: OrganizationAuthorizationService;
  clock: Readonly<{ now: () => Date }>;
  ids: Readonly<{ createOrganizationId: () => string }>;
}>;

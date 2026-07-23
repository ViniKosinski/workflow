import type { OrganizationMembership, OrganizationRole } from "@/modules/organizations/domain/membership";

export type MembershipRepository = Readonly<{
  find: (organizationId: string, userId: string) => Promise<OrganizationMembership | null>;
  list: (organizationId: string) => Promise<ReadonlyArray<OrganizationMembership>>;
  create: (membership: OrganizationMembership) => Promise<OrganizationMembership>;
  updateRole: (organizationId: string, userId: string, role: OrganizationRole, updatedAt: string) => Promise<OrganizationMembership>;
  remove: (organizationId: string, userId: string) => Promise<void>;
  hasActiveTasksAssigned: (organizationId: string, userId: string) => Promise<boolean>;
}>;

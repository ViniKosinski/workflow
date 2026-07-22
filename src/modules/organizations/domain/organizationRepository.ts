import type { Organization } from "@/modules/organizations/domain/organization";
import type { OrganizationMembership } from "@/modules/organizations/domain/membership";

export type CreateOrganizationRecord = Readonly<{
  organization: Organization;
  ownerMembership: OrganizationMembership;
}>;

export type OrganizationRepository = Readonly<{
  createWithOwner: (record: CreateOrganizationRecord) => Promise<Organization>;
  findById: (organizationId: string) => Promise<Organization | null>;
  listByUserId: (userId: string) => Promise<ReadonlyArray<Organization>>;
}>;

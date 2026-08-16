import { ASSIGNABLE_MEMBERSHIP_ROLES } from "@/modules/organizations/domain/membership";

export function listOrganizationRoles() {
  return [...ASSIGNABLE_MEMBERSHIP_ROLES];
}

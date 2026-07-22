import { ROLE_PERMISSION_MATRIX } from "@/modules/authorization/domain/authorization";

export function listOrganizationRoles() {
  return Object.entries(ROLE_PERMISSION_MATRIX).map(([role, permissions]) => ({ role, permissions }));
}

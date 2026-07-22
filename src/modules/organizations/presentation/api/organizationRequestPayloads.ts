import type { OrganizationPermission } from "@/modules/authorization/domain/authorization";
import { ORGANIZATION_PERMISSIONS } from "@/modules/authorization/domain/authorization";
import type { OrganizationRole } from "@/modules/organizations/domain/membership";
import { parseJsonObject, requireString } from "@/shared/presentation/api/httpRequest";
import { HttpRequestError } from "@/shared/presentation/api/httpRequest";

export async function parseCreateOrganizationPayload(request: Request) {
  const body = await parseJsonObject(request);
  return { name: requireString(body, "name", 160) };
}

export async function parseAddMemberPayload(request: Request) {
  const body = await parseJsonObject(request);
  return {
    email: requireString(body, "email", 320),
    role: requireString(body, "role", 16) as OrganizationRole,
  };
}

export async function parseChangeRolePayload(request: Request) {
  const body = await parseJsonObject(request);
  return { role: requireString(body, "role", 16) as OrganizationRole };
}

export function parsePermission(value: string | null): OrganizationPermission | undefined {
  if (!value) return undefined;
  if (!Object.values(ORGANIZATION_PERMISSIONS).includes(value as OrganizationPermission)) {
    throw new HttpRequestError(400, "Permissão inválida.");
  }
  return value as OrganizationPermission;
}

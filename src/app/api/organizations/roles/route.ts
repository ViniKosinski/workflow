import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { listOrganizationRoles } from "@/modules/organizations/application/listOrganizationRoles";
import { organizationErrorResponse, organizationJsonResponse } from "@/modules/organizations/presentation/api/organizationApiResponses";

export async function GET() {
  try {
    await resolveAuthenticatedUser();
    return organizationJsonResponse({ roles: listOrganizationRoles() });
  } catch (error) { return organizationErrorResponse(error); }
}

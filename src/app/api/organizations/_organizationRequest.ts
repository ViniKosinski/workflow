import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { organizationDependencies } from "@/modules/organizations/organizationDependencies";
import { validateMutationRequest } from "@/shared/presentation/api/httpRequest";

export async function getOrganizationRequestContext(request?: Request) {
  const user = await resolveAuthenticatedUser();
  if (request) validateMutationRequest(request);
  return { user, dependencies: organizationDependencies };
}

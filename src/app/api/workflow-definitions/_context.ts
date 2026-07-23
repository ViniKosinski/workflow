import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { getActiveOrganizationId } from "@/modules/organizations/presentation/server/activeOrganization";
import { createWorkflowDefinitionDependencies } from "@/modules/workflowDefinitions/workflowDefinitionDependencies";
import { HttpRequestError, validateMutationRequest } from "@/shared/presentation/api/httpRequest";

export async function getWorkflowDefinitionContext(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") validateMutationRequest(request);
  const user = await resolveAuthenticatedUser();
  const requested = request.headers.get("x-organization-id")?.trim();
  if (requested && requested.length > 64) throw new HttpRequestError(400, "Organização inválida.");
  const organizationId = requested || await getActiveOrganizationId(user.userId);
  return { user, organizationId, dependencies: createWorkflowDefinitionDependencies(user.userId, organizationId) };
}

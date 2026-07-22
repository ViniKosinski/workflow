import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { createWorkflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";
import { HttpRequestError, validateMutationRequest } from "@/shared/presentation/api/httpRequest";

export async function getWorkflowRequestContext(request?: Request) {
  const user = await resolveAuthenticatedUser();
  if (request && request.method !== "GET" && request.method !== "HEAD") validateMutationRequest(request);
  const requestedOrganizationId = request?.headers.get("x-organization-id")?.trim();
  if (requestedOrganizationId && requestedOrganizationId.length > 64) {
    throw new HttpRequestError(400, "Organização inválida.");
  }
  const organizationId = requestedOrganizationId || user.userId;
  return {
    user,
    organizationId,
    dependencies: createWorkflowPersistenceDependencies(user.userId, organizationId),
  };
}

import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { createWorkflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";
import { validateMutationRequest } from "@/shared/presentation/api/httpRequest";

export async function getWorkflowRequestContext(request?: Request) {
  const user = await resolveAuthenticatedUser();
  if (request) validateMutationRequest(request);
  return {
    user,
    dependencies: createWorkflowPersistenceDependencies(user.userId),
  };
}

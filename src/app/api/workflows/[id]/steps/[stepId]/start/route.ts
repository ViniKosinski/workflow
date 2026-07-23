import { startTask } from "@/modules/tasks/application/startTask";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";
import { taskErrorResponse } from "@/modules/tasks/presentation/api/taskApiResponses";
import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { validateMutationRequest } from "@/shared/presentation/api/httpRequest";

type WorkflowStepRouteContext = {
  params: Promise<{
    id: string;
    stepId: string;
  }>;
};

export async function POST(
  _request: Request,
  context: WorkflowStepRouteContext,
) {
  try {
    const { id, stepId } = await context.params;
    validateMutationRequest(_request);
    const user = await resolveAuthenticatedUser();
    const workflow = await startTask(createTaskDependencies(user.userId), stepId, user.userId, id);

    return Response.json({ workflow });
  } catch (error) {
    return taskErrorResponse(error);
  }
}

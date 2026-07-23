import { completeTask } from "@/modules/tasks/application/completeTask";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";
import { taskErrorResponse } from "@/modules/tasks/presentation/api/taskApiResponses";
import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { validateMutationRequest } from "@/shared/presentation/api/httpRequest";
import { parseCompletionPayload } from "@/modules/workflows/presentation/api/workflowRequestPayloads";

type WorkflowStepRouteContext = {
  params: Promise<{
    id: string;
    stepId: string;
  }>;
};

export async function POST(
  request: Request,
  context: WorkflowStepRouteContext,
) {
  try {
    const { id, stepId } = await context.params;
    validateMutationRequest(request);
    const user = await resolveAuthenticatedUser();
    const body = await parseCompletionPayload(request);
    const workflow = await completeTask(createTaskDependencies(user.userId), { taskId: stepId, expectedWorkflowId: id, message: body.message, selectedResult: body.result, observation: body.observation }, user.userId);

    return Response.json({ workflow });
  } catch (error) {
    return taskErrorResponse(error);
  }
}

import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { startTask } from "@/modules/tasks/application/startTask";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";
import { taskErrorResponse } from "@/modules/tasks/presentation/api/taskApiResponses";
import { validateMutationRequest } from "@/shared/presentation/api/httpRequest";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    validateMutationRequest(request);
    const user = await resolveAuthenticatedUser();
    const { id } = await context.params;
    return Response.json({ workflow: await startTask(createTaskDependencies(user.userId), id, user.userId) });
  } catch (error) {
    return taskErrorResponse(error);
  }
}

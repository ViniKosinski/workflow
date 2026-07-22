import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { completeTask } from "@/modules/tasks/application/completeTask";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";
import { taskErrorResponse } from "@/modules/tasks/presentation/api/taskApiResponses";
import { parseJsonObject, optionalString, validateMutationRequest } from "@/shared/presentation/api/httpRequest";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    validateMutationRequest(request);
    const user = await resolveAuthenticatedUser();
    const { id } = await context.params;
    const body = await parseJsonObject(request);
    const message = optionalString(body, "message", 2_000)?.trim();
    const workflow = await completeTask(createTaskDependencies(user.userId), { taskId: id, message }, user.userId);
    return Response.json({ workflow });
  } catch (error) { return taskErrorResponse(error); }
}

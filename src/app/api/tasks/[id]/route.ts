import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { getMyTask } from "@/modules/tasks/application/getMyTask";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";
import { taskErrorResponse } from "@/modules/tasks/presentation/api/taskApiResponses";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await resolveAuthenticatedUser();
    const { id } = await context.params;
    return Response.json({ task: await getMyTask(createTaskDependencies(user.userId), id, user.userId) });
  } catch (error) { return taskErrorResponse(error); }
}

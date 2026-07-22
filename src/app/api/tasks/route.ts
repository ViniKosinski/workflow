import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { listMyTasks } from "@/modules/tasks/application/listMyTasks";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";
import { taskErrorResponse } from "@/modules/tasks/presentation/api/taskApiResponses";

export async function GET(request: Request) {
  try {
    const user = await resolveAuthenticatedUser();
    const order = new URL(request.url).searchParams.get("order") === "asc" ? "asc" : "desc";
    return Response.json({ tasks: await listMyTasks(createTaskDependencies(user.userId), user.userId, order) });
  } catch (error) { return taskErrorResponse(error); }
}

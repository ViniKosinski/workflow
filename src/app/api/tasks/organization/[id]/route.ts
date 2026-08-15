import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { getOrganizationTask } from "@/modules/tasks/application/listOrganizationTasks";
import { taskErrorResponse } from "@/modules/tasks/presentation/api/taskApiResponses";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await resolveAuthenticatedUser();
    const organizationId = new URL(request.url).searchParams.get("organizationId")?.trim().slice(0, 64);
    if (!organizationId) return Response.json({ message: "Organização não informada." }, { status: 400 });
    const detail = await getOrganizationTask(createTaskDependencies(user.userId), user.userId, organizationId, (await context.params).id);
    return detail ? Response.json(detail) : Response.json({ message: "Tarefa não encontrada." }, { status: 404 });
  } catch (error) { return taskErrorResponse(error); }
}

import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { listOrganizationTasks } from "@/modules/tasks/application/listOrganizationTasks";
import { taskErrorResponse } from "@/modules/tasks/presentation/api/taskApiResponses";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";

export async function GET(request: Request) {
  try {
    const user = await resolveAuthenticatedUser();
    const params = new URL(request.url).searchParams;
    const organizationId = params.get("organizationId")?.trim().slice(0, 64);
    if (!organizationId) return Response.json({ message: "Organização não informada." }, { status: 400 });
    const status = params.get("status");
    return Response.json(await listOrganizationTasks(createTaskDependencies(user.userId), user.userId, organizationId, {
      order: params.get("order") === "asc" ? "asc" : "desc",
      page: Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1),
      pageSize: Math.min(50, Math.max(1, Number.parseInt(params.get("pageSize") ?? "10", 10) || 10)),
      search: params.get("search")?.trim().slice(0, 120) || undefined,
      assigneeUserId: params.get("assigneeUserId")?.trim().slice(0, 64) || undefined,
      status: status === "pending" || status === "running" || status === "completed" ? status : undefined,
    }));
  } catch (error) { return taskErrorResponse(error); }
}

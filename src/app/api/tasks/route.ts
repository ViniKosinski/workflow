import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { listMyTasks } from "@/modules/tasks/application/listMyTasks";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";
import { taskErrorResponse } from "@/modules/tasks/presentation/api/taskApiResponses";

export async function GET(request: Request) {
  try {
    const user = await resolveAuthenticatedUser();
    const params = new URL(request.url).searchParams;
    const order = params.get("order") === "asc" ? "asc" : "desc";
    const status = params.get("status");
    const page = Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, Number.parseInt(params.get("pageSize") ?? "10", 10) || 10));
    const result = await listMyTasks(createTaskDependencies(user.userId), user.userId, {
      order,
      page,
      pageSize,
      search: params.get("search")?.trim().slice(0, 120) || undefined,
      organizationId: params.get("organizationId")?.trim().slice(0, 64) || undefined,
      status: status === "pending" || status === "running" ? status : undefined,
    });
    return Response.json(result);
  } catch (error) { return taskErrorResponse(error); }
}

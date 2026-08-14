import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { completeTask } from "@/modules/tasks/application/completeTask";
import { createTaskDependencies } from "@/modules/tasks/taskDependencies";
import { taskErrorResponse } from "@/modules/tasks/presentation/api/taskApiResponses";
import { HttpRequestError, parseJsonObject, optionalString, validateMutationRequest } from "@/shared/presentation/api/httpRequest";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    validateMutationRequest(request);
    const user = await resolveAuthenticatedUser();
    const { id } = await context.params;
    const body = await parseJsonObject(request);
    const message = optionalString(body, "message", 2_000)?.trim();
    const selectedResult = optionalString(body, "result", 120)?.trim();
    const observation = optionalString(body, "observation", 2_000)?.trim();
    if (body.formVersion !== undefined && (!Number.isInteger(body.formVersion) || Number(body.formVersion) < 1)) throw new HttpRequestError(400, "Versão do formulário inválida.");
    if (body.formValues !== undefined && (!body.formValues || typeof body.formValues !== "object" || Array.isArray(body.formValues))) throw new HttpRequestError(400, "Valores do formulário inválidos.");
    const workflow = await completeTask(createTaskDependencies(user.userId), {
      taskId: id, message, selectedResult, observation,
      formVersion: body.formVersion === undefined ? undefined : Number(body.formVersion),
      formValues: body.formValues as Record<string, unknown> | undefined,
    }, user.userId);
    return Response.json({ workflow });
  } catch (error) { return taskErrorResponse(error); }
}

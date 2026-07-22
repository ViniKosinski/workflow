import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";
import { assignWorkflowStep } from "@/modules/workflows/application/assignWorkflowStep";
import { PrismaMembershipRepository } from "@/modules/organizations/infrastructure/prismaMembershipRepository";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";
import { HttpRequestError, parseJsonObject, requireString } from "@/shared/presentation/api/httpRequest";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; stepId: string }> }) {
  try {
    const { dependencies, organizationId } = await getWorkflowRequestContext(request);
    const { id, stepId } = await context.params;
    const body = await parseJsonObject(request);
    const type = requireString(body, "type", 10);
    const assignee = type === "user"
      ? { type: "user" as const, userId: requireString(body, "userId", 64) }
      : type === "role"
        ? { type: "role" as const, role: requireString(body, "role", 10) as "owner" | "admin" | "editor" | "viewer" }
        : null;
    if (!assignee) throw new HttpRequestError(400, "Tipo de responsável inválido.");
    const workflow = await assignWorkflowStep(dependencies, new PrismaMembershipRepository(), organizationId, { workflowId: id, stepId, assignee });
    return Response.json({ workflow });
  } catch (error) { return workflowErrorResponse(error); }
}

import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import { reorderWorkflowDefinitionFormFields } from "@/modules/workflowDefinitions/application/workflowFormUseCases";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";
import { HttpRequestError, parseJsonObject } from "@/shared/presentation/api/httpRequest";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { dependencies } = await getWorkflowDefinitionContext(request);
    const body = await parseJsonObject(request);
    if (!Array.isArray(body.fieldIds) || body.fieldIds.some((id) => typeof id !== "string")) throw new HttpRequestError(400, "Ordenação inválida.");
    const definition = await reorderWorkflowDefinitionFormFields(dependencies, id, body.fieldIds as string[]);
    return Response.json({ definition, fields: definition.form });
  } catch (error) { return workflowErrorResponse(error); }
}

import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import {
  removeWorkflowDefinitionFormField,
  updateWorkflowDefinitionFormField,
} from "@/modules/workflowDefinitions/application/workflowFormUseCases";
import { parseWorkflowFormFieldPayload } from "@/modules/workflowDefinitions/presentation/api/workflowFormPayload";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

type Context = { params: Promise<{ id: string; fieldId: string }> };
export async function PATCH(request: Request, context: Context) {
  try {
    const { id, fieldId } = await context.params;
    const { dependencies } = await getWorkflowDefinitionContext(request);
    const definition = await updateWorkflowDefinitionFormField(dependencies, id, fieldId, await parseWorkflowFormFieldPayload(request));
    return Response.json({ definition, fields: definition.form });
  } catch (error) { return workflowErrorResponse(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const { id, fieldId } = await context.params;
    const { dependencies } = await getWorkflowDefinitionContext(request);
    await removeWorkflowDefinitionFormField(dependencies, id, fieldId);
    return new Response(null, { status: 204 });
  } catch (error) { return workflowErrorResponse(error); }
}

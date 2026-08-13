import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import { addWorkflowDefinitionFormField } from "@/modules/workflowDefinitions/application/workflowFormUseCases";
import { parseWorkflowFormFieldPayload } from "@/modules/workflowDefinitions/presentation/api/workflowFormPayload";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { dependencies } = await getWorkflowDefinitionContext(request);
    const definition = await addWorkflowDefinitionFormField(dependencies, id, await parseWorkflowFormFieldPayload(request));
    return Response.json({ definition, fields: definition.form }, { status: 201 });
  } catch (error) { return workflowErrorResponse(error); }
}

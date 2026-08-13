import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import { getWorkflowRunForm } from "@/modules/workflowDefinitions/application/workflowFormUseCases";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { dependencies } = await getWorkflowDefinitionContext(request);
    return Response.json({ form: await getWorkflowRunForm(dependencies, id) });
  } catch (error) { return workflowErrorResponse(error); }
}

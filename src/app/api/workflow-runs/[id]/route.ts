import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import { getWorkflowRun } from "@/modules/workflowDefinitions/application/workflowDefinitionUseCases";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return Response.json({ run: await getWorkflowRun((await getWorkflowDefinitionContext(request)).dependencies, id) });
  } catch (error) { return workflowErrorResponse(error); }
}

import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import { startWorkflowDefinitionRun } from "@/modules/workflowDefinitions/application/workflowDefinitionUseCases";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { dependencies, user } = await getWorkflowDefinitionContext(request);
    return Response.json({ run: await startWorkflowDefinitionRun(dependencies, id, user.userId) }, { status: 201 });
  } catch (error) { return workflowErrorResponse(error); }
}

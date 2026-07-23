import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import { listWorkflowRuns } from "@/modules/workflowDefinitions/application/workflowDefinitionUseCases";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

export async function GET(request: Request) {
  try {
    const definitionId = new URL(request.url).searchParams.get("definitionId") ?? undefined;
    return Response.json({ runs: await listWorkflowRuns((await getWorkflowDefinitionContext(request)).dependencies, { definitionId }) });
  } catch (error) { return workflowErrorResponse(error); }
}

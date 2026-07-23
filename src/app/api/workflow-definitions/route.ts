import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import {
  createWorkflowDefinition,
  listWorkflowDefinitions,
} from "@/modules/workflowDefinitions/application/workflowDefinitionUseCases";
import { parseWorkflowDefinitionPayload } from "@/modules/workflowDefinitions/presentation/api/workflowDefinitionPayload";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") as "draft" | "published" | "archived" | null;
    if (status && !["draft", "published", "archived"].includes(status)) {
      return Response.json({ message: "Status inválido." }, { status: 400 });
    }
    const definitions = await listWorkflowDefinitions((await getWorkflowDefinitionContext(request)).dependencies, {
      status: status ?? undefined,
    });
    return Response.json({ definitions });
  } catch (error) { return workflowErrorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const { dependencies, user } = await getWorkflowDefinitionContext(request);
    const definition = await createWorkflowDefinition(dependencies, await parseWorkflowDefinitionPayload(request), user.userId);
    return Response.json({ definition }, { status: 201 });
  } catch (error) { return workflowErrorResponse(error); }
}

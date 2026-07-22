import { createWorkflow } from "@/modules/workflows/application/createWorkflow";
import { listPersistedWorkflows } from "@/modules/workflows/application/listPersistedWorkflows";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { getWorkflowRequestContext } from "@/app/api/workflows/_workflowRequest";
import { parseCreateWorkflowPayload } from "@/modules/workflows/presentation/api/workflowRequestPayloads";
import { HttpRequestError } from "@/shared/presentation/api/httpRequest";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
      throw new HttpRequestError(400, "Paginação inválida.");
    }
    const workflows = await listPersistedWorkflows(
      (await getWorkflowRequestContext()).dependencies,
      { limit, offset },
    );

    return workflowJsonResponse({ workflows });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const { dependencies } = await getWorkflowRequestContext(request);
    const workflow = await createWorkflow(dependencies, await parseCreateWorkflowPayload(request));

    return workflowJsonResponse({ workflow }, { status: 201 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

import { createWorkflow } from "@/modules/workflows/application/createWorkflow";
import { listPersistedWorkflows } from "@/modules/workflows/application/listPersistedWorkflows";
import {
  workflowErrorResponse,
  workflowJsonResponse,
} from "@/modules/workflows/presentation/api/workflowApiResponses";
import { workflowPersistenceDependencies } from "@/modules/workflows/workflowPersistenceDependencies";

export async function GET() {
  try {
    const workflows = await listPersistedWorkflows(
      workflowPersistenceDependencies,
    );

    return workflowJsonResponse({ workflows });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: unknown;
      steps?: Array<{
        name?: unknown;
        order?: unknown;
      }>;
    };
    const workflow = await createWorkflow(workflowPersistenceDependencies, {
      name: String(body.name ?? ""),
      steps: Array.isArray(body.steps)
        ? body.steps.map((step, index) => ({
            name: String(step.name ?? ""),
            order: Number(step.order ?? index + 1),
          }))
        : [],
    });

    return workflowJsonResponse({ workflow }, { status: 201 });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}

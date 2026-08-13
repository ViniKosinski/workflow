import { getWorkflowDefinitionContext } from "@/app/api/workflow-definitions/_context";
import { getWorkflowRunForm, updateWorkflowRunFormValues } from "@/modules/workflowDefinitions/application/workflowFormUseCases";
import { parseWorkflowFormValuesPayload } from "@/modules/workflowDefinitions/presentation/api/workflowFormPayload";
import { workflowErrorResponse } from "@/modules/workflows/presentation/api/workflowApiResponses";

type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const { dependencies } = await getWorkflowDefinitionContext(request);
    const form = await getWorkflowRunForm(dependencies, id);
    return Response.json({ values: form.values, version: form.version });
  } catch (error) { return workflowErrorResponse(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const { user, dependencies } = await getWorkflowDefinitionContext(request);
    const input = await parseWorkflowFormValuesPayload(request);
    return Response.json({ form: await updateWorkflowRunFormValues(dependencies, id, input.version, input.values, user.userId) });
  } catch (error) { return workflowErrorResponse(error); }
}

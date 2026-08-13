import type { WorkflowFormFieldCommand } from "@/modules/workflowDefinitions/application/workflowDefinitionApplicationTypes";
import { WORKFLOW_FORM_FIELD_TYPES, type WorkflowFormValue } from "@/modules/workflowDefinitions/domain/workflowForm";
import { HttpRequestError, parseJsonObject, requireString } from "@/shared/presentation/api/httpRequest";

export async function parseWorkflowFormFieldPayload(request: Request): Promise<WorkflowFormFieldCommand> {
  const body = await parseJsonObject(request);
  const type = body.type;
  if (typeof type !== "string" || !WORKFLOW_FORM_FIELD_TYPES.includes(type as never)) throw new HttpRequestError(400, "Tipo de campo inválido.");
  if (typeof body.required !== "boolean") throw new HttpRequestError(400, "Obrigatoriedade inválida.");
  if (!Number.isInteger(body.order) || Number(body.order) < 1) throw new HttpRequestError(400, "Ordem inválida.");
  if (body.options !== undefined && !Array.isArray(body.options)) throw new HttpRequestError(400, "Opções inválidas.");
  const options = (body.options as unknown[] | undefined ?? []).map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new HttpRequestError(400, "Opção inválida.");
    const option = raw as Record<string, unknown>;
    const order = option.order ?? index + 1;
    if (!Number.isInteger(order) || Number(order) < 1) throw new HttpRequestError(400, "Ordem da opção inválida.");
    return { value: requireString(option, "value", 160), label: requireString(option, "label", 255), order: Number(order) };
  });
  return {
    key: requireString(body, "key", 120),
    label: requireString(body, "label", 255),
    description: typeof body.description === "string" ? body.description.slice(0, 2_000) : undefined,
    type: type as WorkflowFormFieldCommand["type"],
    required: body.required,
    order: Number(body.order),
    defaultValue: body.defaultValue as WorkflowFormValue | undefined,
    options,
  };
}

export async function parseWorkflowFormValuesPayload(request: Request) {
  const body = await parseJsonObject(request);
  if (!Number.isInteger(body.version) || Number(body.version) < 1) throw new HttpRequestError(400, "Versão inválida.");
  if (!body.values || typeof body.values !== "object" || Array.isArray(body.values)) throw new HttpRequestError(400, "Valores inválidos.");
  return { version: Number(body.version), values: body.values as Record<string, unknown> };
}

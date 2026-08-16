import { HttpRequestError, optionalString, parseJsonObject, requireString, requireStringArray } from "@/shared/presentation/api/httpRequest";

export async function parseCreateWorkflowPayload(request: Request) {
  const body = await parseJsonObject(request);
  const steps = body.steps;
  if (!Array.isArray(steps) || steps.length === 0 || steps.length > 100) {
    throw new HttpRequestError(400, "O campo steps deve conter entre 1 e 100 etapas.");
  }
  return {
    name: requireString(body, "name", 255),
    steps: steps.map((value, index) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new HttpRequestError(400, `A etapa ${index + 1} é inválida.`);
      }
      const step = value as Record<string, unknown>;
      const order = step.order ?? index + 1;
      if (typeof order !== "number" || !Number.isInteger(order) || order < 1 || order > 100) {
        throw new HttpRequestError(400, `A ordem da etapa ${index + 1} é inválida.`);
      }
      const transitions = step.transitions;
      if (transitions !== undefined && (!Array.isArray(transitions) || transitions.length === 0 || transitions.length > 20)) {
        throw new HttpRequestError(400, `Os resultados da etapa ${index + 1} são inválidos.`);
      }
      return {
        name: requireString(step, "name", 255),
        order,
        transitions: transitions?.map((value, transitionIndex) => {
          if (!value || typeof value !== "object" || Array.isArray(value)) {
            throw new HttpRequestError(400, `O resultado ${transitionIndex + 1} da etapa ${index + 1} é inválido.`);
          }
          const transition = value as Record<string, unknown>;
          const endsWorkflow = transition.endsWorkflow;
          const targetStepOrder = transition.targetStepOrder;
          if (typeof endsWorkflow !== "boolean" || endsWorkflow === (targetStepOrder !== undefined)) {
            throw new HttpRequestError(400, `O destino do resultado ${transitionIndex + 1} da etapa ${index + 1} é inválido.`);
          }
          if (targetStepOrder !== undefined && (typeof targetStepOrder !== "number" || !Number.isInteger(targetStepOrder) || targetStepOrder < 1 || targetStepOrder > 100)) {
            throw new HttpRequestError(400, `O destino do resultado ${transitionIndex + 1} da etapa ${index + 1} é inválido.`);
          }
          return { name: requireString(transition, "name", 120), description: optionalString(transition, "description", 2_000), result: requireString(transition, "result", 120), endsWorkflow, targetStepOrder };
        }),
      };
    }),
  };
}

export async function parseStepNamePayload(request: Request) {
  const body = await parseJsonObject(request);
  return { name: requireString(body, "name", 255) };
}

export async function parseReasonPayload(request: Request) {
  const body = await parseJsonObject(request);
  return { reason: requireString(body, "reason", 2_000) };
}

export async function parseFailurePayload(request: Request) {
  const body = await parseJsonObject(request);
  return {
    reason: requireString(body, "reason", 2_000),
    stepId: optionalString(body, "stepId", 64),
  };
}

export async function parseCompletionPayload(request: Request) {
  const body = await parseJsonObject(request);
  return { message: optionalString(body, "message", 2_000) ?? "Etapa concluída.", result: optionalString(body, "result", 120), observation: optionalString(body, "observation", 2_000) };
}

export async function parseReorderPayload(request: Request) {
  const body = await parseJsonObject(request);
  const orderedStepIds = requireStringArray(body, "orderedStepIds", 100);
  if (orderedStepIds.some((id) => id.length === 0 || id.length > 64)) {
    throw new HttpRequestError(400, "A lista de etapas contém identificadores inválidos.");
  }
  return { orderedStepIds };
}

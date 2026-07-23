import { HttpRequestError, optionalString, parseJsonObject, requireString } from "@/shared/presentation/api/httpRequest";

export async function parseTransitionPayload(request: Request) {
  const body = await parseJsonObject(request);
  const endsWorkflow = body.endsWorkflow;
  if (typeof endsWorkflow !== "boolean") throw new HttpRequestError(400, "Encerramento inválido.");
  return { name: requireString(body, "name", 160), description: optionalString(body, "description", 2_000), result: requireString(body, "result", 120), targetStepId: optionalString(body, "targetStepId", 64), endsWorkflow };
}

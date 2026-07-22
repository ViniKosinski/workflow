export class HttpRequestError extends Error {
  constructor(
    readonly status: 400 | 403 | 413 | 415 | 429,
    message: string,
    readonly headers?: Readonly<Record<string, string>>,
  ) {
    super(message);
    this.name = "HttpRequestError";
  }
}

const MAX_JSON_BYTES = 64 * 1024;

export async function parseJsonObject(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  if (contentType !== "application/json") {
    throw new HttpRequestError(415, "O conteúdo deve ser enviado como JSON.");
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    throw new HttpRequestError(413, "A solicitação excede o tamanho permitido.");
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_JSON_BYTES) {
    throw new HttpRequestError(413, "A solicitação excede o tamanho permitido.");
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new HttpRequestError(400, "JSON inválido.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpRequestError(400, "O corpo da solicitação deve ser um objeto.");
  }
  return value as Record<string, unknown>;
}

export function requireString(body: Record<string, unknown>, field: string, maxLength: number) {
  const value = body[field];
  if (typeof value !== "string" || value.length > maxLength) {
    throw new HttpRequestError(400, `O campo ${field} é inválido.`);
  }
  return value;
}

export function optionalString(body: Record<string, unknown>, field: string, maxLength: number) {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length > maxLength) {
    throw new HttpRequestError(400, `O campo ${field} é inválido.`);
  }
  return value;
}

export function requireStringArray(body: Record<string, unknown>, field: string, maxItems: number) {
  const value = body[field];
  if (!Array.isArray(value) || value.length > maxItems || value.some((item) => typeof item !== "string")) {
    throw new HttpRequestError(400, `O campo ${field} é inválido.`);
  }
  return value as string[];
}

export function validateMutationRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) throw new HttpRequestError(403, "Origem da solicitação ausente.");
  const configured = (process.env.AUTH_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowed = new Set([new URL(request.url).origin, ...configured]);
  if (!allowed.has(origin)) throw new HttpRequestError(403, "Origem da solicitação inválida.");
}

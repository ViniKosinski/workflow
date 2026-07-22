import type { AuthApplicationDependencies } from "@/modules/auth/application/authApplicationTypes";
import { HttpRequestError } from "@/shared/presentation/api/httpRequest";

export async function enforceAuthRateLimit(
  dependencies: AuthApplicationDependencies,
  request: Request,
  action: string,
  identity: string,
  limit: number,
) {
  const now = dependencies.clock.now();
  const keys = [`${action}:identity:${identity.trim().toLowerCase()}`];
  if (process.env.AUTH_TRUST_PROXY === "true") {
    const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwardedIp) keys.push(`${action}:ip:${forwardedIp}`);
  }
  for (const value of keys) {
    const key = dependencies.sessionTokens.hash(value);
    if (!(await dependencies.rateLimiter.consume({ key, limit, windowMs: 60_000, now }))) {
      throw new HttpRequestError(429, "Muitas tentativas. Aguarde um minuto e tente novamente.", { "Retry-After": "60" });
    }
  }
  await dependencies.rateLimiter.deleteExpired(now);
}

export function getTrustedRequestMetadata(request: Request) {
  const ipAddress = process.env.AUTH_TRUST_PROXY === "true"
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64)
    : undefined;
  return {
    userAgent: request.headers.get("user-agent")?.slice(0, 512) || undefined,
    ipAddress,
  };
}

import { describe, expect, it, vi } from "vitest";
import { enforceAuthRateLimit, getTrustedRequestMetadata } from "@/modules/auth/presentation/api/rateLimit";

describe("authentication rate limiting", () => {
  it("usa identidade normalizada e retorna 429 quando o limite estoura", async () => {
    const consume = vi.fn().mockResolvedValue(false);
    const dependencies = {
      clock: { now: () => new Date("2026-07-21T00:00:00Z") },
      sessionTokens: { hash: (value: string) => `hash:${value}` },
      rateLimiter: { consume, deleteExpired: vi.fn() },
    };
    const request = new Request("http://localhost/api", { headers: { "x-forwarded-for": "203.0.113.8" } });
    await expect(enforceAuthRateLimit(dependencies as never, request, "login", " USER@EXAMPLE.COM ", 10)).rejects.toMatchObject({ status: 429, headers: { "Retry-After": "60" } });
    expect(consume).toHaveBeenCalledWith(expect.objectContaining({ key: "hash:login:identity:user@example.com", limit: 10 }));
  });

  it("ignora headers de IP sem proxy explicitamente confiável", () => {
    vi.stubEnv("AUTH_TRUST_PROXY", "false");
    const metadata = getTrustedRequestMetadata(new Request("http://localhost", { headers: { "x-forwarded-for": "203.0.113.8", "user-agent": "test" } }));
    expect(metadata).toEqual({ userAgent: "test", ipAddress: undefined });
  });
});

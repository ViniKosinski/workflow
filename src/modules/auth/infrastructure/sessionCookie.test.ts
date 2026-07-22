import { beforeEach, describe, expect, it, vi } from "vitest";

const setCookie = vi.fn();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: vi.fn(), set: setCookie }),
}));

import { clearSessionCookie, writeSessionCookie } from "@/modules/auth/infrastructure/sessionCookie";

describe("session cookie", () => {
  beforeEach(() => setCookie.mockClear());

  it("grava token com flags de segurança", async () => {
    const expiresAt = "2026-07-28T00:00:00.000Z";
    await writeSessionCookie("secret", expiresAt);
    expect(setCookie).toHaveBeenCalledWith("workflow_session", "secret", expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      priority: "high",
      path: "/",
      expires: new Date(expiresAt),
    }));
  });

  it("remove o cookie usando as mesmas flags", async () => {
    await clearSessionCookie();
    expect(setCookie).toHaveBeenCalledWith("workflow_session", "", expect.objectContaining({
      httpOnly: true,
      sameSite: "lax",
      priority: "high",
      path: "/",
      expires: new Date(0),
    }));
  });
});

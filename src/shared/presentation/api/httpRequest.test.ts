import { describe, expect, it, vi } from "vitest";
import { HttpRequestError, parseJsonObject, requireString, requireStringArray, validateMutationRequest } from "@/shared/presentation/api/httpRequest";

describe("HTTP request hardening", () => {
  it("aceita JSON objeto válido", async () => {
    const request = new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Fluxo" }) });
    await expect(parseJsonObject(request)).resolves.toEqual({ name: "Fluxo" });
  });

  it("rejeita JSON inválido, tipo incorreto e payload grande", async () => {
    await expect(parseJsonObject(new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).rejects.toMatchObject({ status: 400 });
    await expect(parseJsonObject(new Request("http://localhost/api", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }))).rejects.toMatchObject({ status: 415 });
    await expect(parseJsonObject(new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json", "content-length": "70000" }, body: "{}" }))).rejects.toMatchObject({ status: 413 });
  });

  it("valida campos escalares e listas sem coerção", () => {
    expect(() => requireString({ name: 123 }, "name", 20)).toThrow(HttpRequestError);
    expect(() => requireStringArray({ ids: ["a", 2] }, "ids", 10)).toThrow(HttpRequestError);
  });

  it("exige origem e aceita somente origens configuradas", () => {
    vi.stubEnv("AUTH_ALLOWED_ORIGINS", "https://app.example.com");
    expect(() => validateMutationRequest(new Request("https://internal.example.com/api", { method: "POST" }))).toThrow(HttpRequestError);
    expect(() => validateMutationRequest(new Request("https://internal.example.com/api", { method: "POST", headers: { origin: "https://evil.example.com" } }))).toThrow(HttpRequestError);
    expect(() => validateMutationRequest(new Request("https://internal.example.com/api", { method: "POST", headers: { origin: "https://app.example.com" } }))).not.toThrow();
  });
});

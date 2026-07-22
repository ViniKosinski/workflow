import { createHash } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

let cookieToken: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => cookieToken ? { value: cookieToken } : undefined, set: vi.fn() }),
}));

import { GET as listOrganizations, POST as createOrganization } from "@/app/api/organizations/route";
import { GET as getOrganization } from "@/app/api/organizations/[organizationId]/route";
import { POST as addMember } from "@/app/api/organizations/[organizationId]/members/route";
import { DELETE as removeMember } from "@/app/api/organizations/[organizationId]/members/[userId]/route";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);
const context = (organizationId: string) => ({ params: Promise.resolve({ organizationId }) });
const memberContext = (organizationId: string, userId: string) => ({ params: Promise.resolve({ organizationId, userId }) });
const post = (url: string, body: unknown, origin = "http://localhost") => new Request(url, { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });

integration("organizations HTTP API", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const users = Object.fromEntries(["owner", "viewer", "outsider"].map((name) => [name, `http-${name}-${suffix}`]));
  const tokens = Object.fromEntries(Object.keys(users).map((name) => [name, `token-${name}-${suffix}`]));
  let organizationId = "";

  beforeAll(async () => {
    await prisma.user.createMany({ data: Object.entries(users).map(([name, id]) => ({ id, email: `${id}@test.invalid`, normalizedEmail: `${id}@test.invalid`, name })) });
    await prisma.userCredential.createMany({ data: Object.values(users).map((userId) => ({ userId, passwordHash: "test-hash" })) });
    await prisma.authSession.createMany({ data: Object.entries(users).map(([name, userId]) => ({ id: `session-${name}-${suffix}`, userId, tokenHash: createHash("sha256").update(tokens[name]).digest("hex"), expiresAt: new Date(Date.now() + 60_000) })) });
  });

  beforeEach(() => { cookieToken = tokens.owner; });

  afterAll(async () => {
    if (organizationId) await prisma.organization.deleteMany({ where: { id: organizationId } });
    await prisma.user.deleteMany({ where: { id: { in: Object.values(users) } } });
    await prisma.$disconnect();
  });

  it("retorna 401 sem cookie de sessão", async () => {
    cookieToken = undefined;
    expect((await listOrganizations()).status).toBe(401);
  });

  it("valida Origin e payload", async () => {
    expect((await createOrganization(post("http://localhost/api/organizations", { name: "Invalid" }, "http://evil.test"))).status).toBe(403);
    expect((await createOrganization(post("http://localhost/api/organizations", { name: 42 }))).status).toBe(400);
  });

  it("retorna 201, 409, 403, 404 e 204 nos fluxos de organização", async () => {
    const created = await createOrganization(post("http://localhost/api/organizations", { name: "HTTP Org" }));
    expect(created.status).toBe(201);
    organizationId = (await created.json()).organization.id;

    const payload = { email: `${users.viewer}@test.invalid`, role: "viewer" };
    expect((await addMember(post(`http://localhost/api/organizations/${organizationId}/members`, payload), context(organizationId))).status).toBe(201);
    expect((await addMember(post(`http://localhost/api/organizations/${organizationId}/members`, payload), context(organizationId))).status).toBe(409);

    cookieToken = tokens.viewer;
    expect((await addMember(post(`http://localhost/api/organizations/${organizationId}/members`, { email: `${users.outsider}@test.invalid`, role: "viewer" }), context(organizationId))).status).toBe(403);
    cookieToken = tokens.outsider;
    expect((await getOrganization(new Request(`http://localhost/api/organizations/${organizationId}`), context(organizationId))).status).toBe(404);
    const existingEmailResponse = await addMember(post(`http://localhost/api/organizations/${organizationId}/members`, payload), context(organizationId));
    const unknownEmailResponse = await addMember(post(`http://localhost/api/organizations/${organizationId}/members`, { email: "unknown@test.invalid", role: "viewer" }), context(organizationId));
    expect(existingEmailResponse.status).toBe(404);
    expect(unknownEmailResponse.status).toBe(404);
    expect(await existingEmailResponse.json()).toEqual(await unknownEmailResponse.json());

    cookieToken = tokens.owner;
    expect((await removeMember(new Request(`http://localhost/api/organizations/${organizationId}/members/${users.viewer}`, { method: "DELETE", headers: { origin: "http://localhost" } }), memberContext(organizationId, users.viewer))).status).toBe(204);
  });
});

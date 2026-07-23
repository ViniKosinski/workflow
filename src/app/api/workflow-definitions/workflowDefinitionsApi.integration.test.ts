import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

let cookieToken: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => name.includes("session") && cookieToken ? { value: cookieToken } : undefined,
    set: vi.fn(),
  }),
}));

import { POST as createDefinition } from "@/app/api/workflow-definitions/route";
import { POST as publishDefinition } from "@/app/api/workflow-definitions/[id]/publish/route";
import { POST as createRun } from "@/app/api/workflow-definitions/[id]/runs/route";
import { GET as listRuns } from "@/app/api/workflow-runs/route";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);
const origin = "http://localhost";

integration("workflow definition HTTP lifecycle", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const suffix = crypto.randomUUID();
  const userId = `definition-api-user-${suffix}`;
  const token = `definition-api-token-${suffix}`;
  const definitionIds: string[] = [];

  const request = (url: string, method: string, body?: unknown) => new Request(url, {
    method,
    headers: { origin, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  beforeAll(async () => {
    cookieToken = token;
    await prisma.user.create({ data: { id: userId, email: `${userId}@test.invalid`, normalizedEmail: `${userId}@test.invalid`, name: "Definition API" } });
    await prisma.userCredential.create({ data: { userId, passwordHash: "hash" } });
    await prisma.authSession.create({
      data: {
        id: `definition-api-session-${suffix}`,
        userId,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await prisma.organization.create({ data: { id: userId, name: "Definition API" } });
    await prisma.organizationMembership.create({ data: { organizationId: userId, userId, role: "OWNER" } });
  });

  afterAll(async () => {
    await prisma.workflowRun.deleteMany({ where: { workflowDefinition: { organizationId: userId } } });
    await prisma.workflowDefinition.deleteMany({ where: { organizationId: userId } });
    await prisma.organization.deleteMany({ where: { id: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("cria, publica e inicia múltiplas execuções da mesma revisão", async () => {
    const firstStepId = crypto.randomUUID();
    const secondStepId = crypto.randomUUID();
    const createdResponse = await createDefinition(request(`${origin}/api/workflow-definitions`, "POST", {
      name: "Processo HTTP",
      steps: [
        {
          id: firstStepId,
          name: "Análise",
          order: 1,
          assignee: { type: "role", role: "owner" },
          transitions: [{ id: crypto.randomUUID(), name: "Continuar", result: "continue", targetStepId: secondStepId, endsWorkflow: false }],
        },
        {
          id: secondStepId,
          name: "Finalização",
          order: 2,
          assignee: { type: "role", role: "owner" },
          transitions: [{ id: crypto.randomUUID(), name: "Finalizar", result: "done", endsWorkflow: true }],
        },
      ],
    }));
    expect(createdResponse.status).toBe(201);
    const definition = (await createdResponse.json()).definition;
    definitionIds.push(definition.id);
    const context = { params: Promise.resolve({ id: definition.id }) };
    expect((await publishDefinition(request(`${origin}/api/workflow-definitions/${definition.id}/publish`, "POST"), context)).status).toBe(200);
    const firstRunResponse = await createRun(request(`${origin}/api/workflow-definitions/${definition.id}/runs`, "POST"), context);
    const secondRunResponse = await createRun(request(`${origin}/api/workflow-definitions/${definition.id}/runs`, "POST"), context);
    expect(firstRunResponse.status).toBe(201);
    expect(secondRunResponse.status).toBe(201);
    const firstRun = (await firstRunResponse.json()).run;
    const secondRun = (await secondRunResponse.json()).run;
    expect(firstRun.id).not.toBe(secondRun.id);
    expect(firstRun.definitionRevision).toBe(1);
    const listed = await listRuns(request(`${origin}/api/workflow-runs?definitionId=${definition.id}`, "GET"));
    expect(listed.status).toBe(200);
    expect((await listed.json()).runs).toHaveLength(2);
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import type { UserRepository } from "@/modules/auth/domain/userRepository";
import type { SessionRepository } from "@/modules/auth/domain/sessionRepository";
import type { RateLimiter } from "@/modules/auth/domain/authServices";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);

integration("authentication persistence with PostgreSQL", () => {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl! }) });
  const userId = `auth-test-${crypto.randomUUID()}`;
  const email = `${userId}@test.invalid`;
  let users: UserRepository;
  let sessions: SessionRepository;
  let rateLimiter: RateLimiter;

  beforeAll(async () => {
    const [{ PrismaUserRepository }, { PrismaSessionRepository }, { PrismaRateLimiter }] = await Promise.all([
      import("@/modules/auth/infrastructure/prismaUserRepository"),
      import("@/modules/auth/infrastructure/prismaSessionRepository"),
      import("@/modules/auth/infrastructure/prismaRateLimiter"),
    ]);
    users = new PrismaUserRepository(prisma);
    sessions = new PrismaSessionRepository(prisma);
    rateLimiter = new PrismaRateLimiter(prisma);
  });

  afterAll(async () => {
    await prisma.authRateLimitBucket.deleteMany({ where: { key: { startsWith: "auth-test" } } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  it("persiste usuário e credencial atomicamente", async () => {
    const now = new Date().toISOString();
    await users.create({ id: userId, email, normalizedEmail: email, name: "Teste", status: "active", passwordHash: "hash", now });
    await expect(users.findByNormalizedEmail(email)).resolves.toMatchObject({ user: { id: userId }, passwordHash: "hash" });
  });

  it("persiste, encontra e revoga sessão pelo hash", async () => {
    const now = new Date();
    const tokenHash = `token-${userId}`;
    await sessions.create({ id: `session-${userId}`, userId, tokenHash, expiresAt: new Date(now.getTime() + 60_000).toISOString(), now: now.toISOString() });
    await expect(sessions.findByTokenHash(tokenHash)).resolves.toMatchObject({ user: { id: userId } });
    await sessions.revokeByTokenHash(tokenHash, now.toISOString());
    await expect(sessions.findByTokenHash(tokenHash)).resolves.toMatchObject({ revokedAt: now.toISOString() });
  });

  it("aplica limite de forma persistente e atômica", async () => {
    const key = `auth-test-${crypto.randomUUID()}`;
    const now = new Date();
    await expect(rateLimiter.consume({ key, limit: 2, windowMs: 60_000, now })).resolves.toBe(true);
    await expect(rateLimiter.consume({ key, limit: 2, windowMs: 60_000, now })).resolves.toBe(true);
    await expect(rateLimiter.consume({ key, limit: 2, windowMs: 60_000, now })).resolves.toBe(false);
  });
});

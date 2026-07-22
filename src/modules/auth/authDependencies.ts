import type { AuthApplicationDependencies } from "@/modules/auth/application/authApplicationTypes";
import { argonPasswordHasher } from "@/modules/auth/infrastructure/argonPasswordHasher";
import { PrismaSessionRepository } from "@/modules/auth/infrastructure/prismaSessionRepository";
import { PrismaUserRepository } from "@/modules/auth/infrastructure/prismaUserRepository";
import { sessionTokenService } from "@/modules/auth/infrastructure/sessionTokenService";
import { PrismaRateLimiter } from "@/modules/auth/infrastructure/prismaRateLimiter";

const DUMMY_PASSWORD_HASH = "$argon2id$v=19$m=19456,t=2,p=1$ON2fd8GSdGQG8aZ0+I/Glw$pQ+zsRiVJIAFSy+mhxTS76AdM8MOVFxzK+HeuCj4qj4";

export const authDependencies: AuthApplicationDependencies = {
  users: new PrismaUserRepository(),
  sessions: new PrismaSessionRepository(),
  passwordHasher: argonPasswordHasher,
  sessionTokens: sessionTokenService,
  rateLimiter: new PrismaRateLimiter(),
  clock: { now: () => new Date() },
  ids: {
    createUserId: () => crypto.randomUUID(),
    createSessionId: () => crypto.randomUUID(),
  },
  sessionDurationMs: 1000 * 60 * 60 * 24 * 7,
  sessionIdleTimeoutMs: 1000 * 60 * 60 * 24,
  sessionTouchIntervalMs: 1000 * 60 * 15,
  dummyPasswordHash: DUMMY_PASSWORD_HASH,
};

import type { Clock, IdGenerator, PasswordHasher, RateLimiter, SessionTokenService } from "@/modules/auth/domain/authServices";
import type { SessionRepository } from "@/modules/auth/domain/sessionRepository";
import type { UserRepository } from "@/modules/auth/domain/userRepository";
import type { AccountProvisioningRepository } from "@/modules/accountProvisioning/domain/accountProvisioningRepository";

export type AuthApplicationDependencies = Readonly<{
  users: UserRepository;
  accountProvisioning: AccountProvisioningRepository;
  sessions: SessionRepository;
  passwordHasher: PasswordHasher;
  sessionTokens: SessionTokenService;
  rateLimiter: RateLimiter;
  clock: Clock;
  ids: IdGenerator;
  sessionDurationMs: number;
  sessionIdleTimeoutMs: number;
  sessionTouchIntervalMs: number;
  dummyPasswordHash: string;
}>;

export type SessionMetadata = Readonly<{
  userAgent?: string;
  ipAddress?: string;
}>;

export type AuthResult = Readonly<{
  user: Readonly<{ userId: string; email: string; name: string }>;
  sessionToken: string;
  expiresAt: string;
}>;

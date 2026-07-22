import type { User } from "@/modules/auth/domain/user";

export type CreateSessionRecord = Readonly<{
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: string;
  now: string;
  userAgent?: string;
  ipAddress?: string;
}>;

export type SessionWithUser = Readonly<{
  id: string;
  tokenHash: string;
  expiresAt: string;
  lastSeenAt: string;
  revokedAt?: string;
  user: User;
}>;

export type SessionRepository = Readonly<{
  create: (record: CreateSessionRecord) => Promise<void>;
  findByTokenHash: (tokenHash: string) => Promise<SessionWithUser | null>;
  touch: (sessionId: string, now: string) => Promise<void>;
  revokeByTokenHash: (tokenHash: string, now: string) => Promise<void>;
  revokeAllForUser: (userId: string, now: string, exceptSessionId?: string) => Promise<void>;
  deleteExpired: (now: string) => Promise<void>;
}>;

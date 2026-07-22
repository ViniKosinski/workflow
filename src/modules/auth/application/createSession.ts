import type { AuthApplicationDependencies, AuthResult, SessionMetadata } from "@/modules/auth/application/authApplicationTypes";
import type { User } from "@/modules/auth/domain/user";

export async function createSession(
  dependencies: AuthApplicationDependencies,
  user: User,
  metadata: SessionMetadata = {},
): Promise<AuthResult> {
  const now = dependencies.clock.now();
  const expiresAt = new Date(now.getTime() + dependencies.sessionDurationMs);
  const sessionToken = dependencies.sessionTokens.create();

  await dependencies.sessions.deleteExpired(now.toISOString());

  await dependencies.sessions.create({
    id: dependencies.ids.createSessionId(),
    userId: user.id,
    tokenHash: dependencies.sessionTokens.hash(sessionToken),
    now: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    ...metadata,
  });

  return {
    user: { userId: user.id, email: user.email, name: user.name },
    sessionToken,
    expiresAt: expiresAt.toISOString(),
  };
}

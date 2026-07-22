import type { AuthApplicationDependencies } from "@/modules/auth/application/authApplicationTypes";
import { UnauthenticatedError } from "@/modules/auth/application/authErrors";
import { USER_STATUSES, type AuthenticatedUser } from "@/modules/auth/domain/user";

export async function getAuthenticatedUser(
  dependencies: AuthApplicationDependencies,
  sessionToken: string | undefined,
): Promise<AuthenticatedUser> {
  if (!sessionToken) throw new UnauthenticatedError();

  const tokenHash = dependencies.sessionTokens.hash(sessionToken);
  const session = await dependencies.sessions.findByTokenHash(tokenHash);
  const now = dependencies.clock.now();

  if (
    !session ||
    session.revokedAt ||
    new Date(session.expiresAt) <= now ||
    new Date(session.lastSeenAt).getTime() + dependencies.sessionIdleTimeoutMs <= now.getTime() ||
    session.user.status !== USER_STATUSES.active
  ) {
    throw new UnauthenticatedError();
  }

  if (new Date(session.lastSeenAt).getTime() + dependencies.sessionTouchIntervalMs <= now.getTime()) {
    await dependencies.sessions.touch(session.id, now.toISOString());
  }
  return { userId: session.user.id, email: session.user.email, name: session.user.name };
}

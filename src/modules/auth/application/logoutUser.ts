import type { AuthApplicationDependencies } from "@/modules/auth/application/authApplicationTypes";

export async function logoutUser(
  dependencies: AuthApplicationDependencies,
  sessionToken: string | undefined,
) {
  if (!sessionToken) return;
  await dependencies.sessions.revokeByTokenHash(
    dependencies.sessionTokens.hash(sessionToken),
    dependencies.clock.now().toISOString(),
  );
}

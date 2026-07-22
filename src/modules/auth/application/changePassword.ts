import type { AuthApplicationDependencies } from "@/modules/auth/application/authApplicationTypes";
import { InvalidCredentialsError } from "@/modules/auth/application/authErrors";
import { validatePassword } from "@/modules/auth/application/authValidation";

export async function changePassword(
  dependencies: AuthApplicationDependencies,
  userId: string,
  input: Readonly<{ currentPassword: string; newPassword: string }>,
) {
  const currentPasswordHash = await dependencies.users.findCredentialByUserId(userId);
  if (!currentPasswordHash || !(await dependencies.passwordHasher.verify(currentPasswordHash, input.currentPassword))) {
    throw new InvalidCredentialsError();
  }
  const passwordHash = await dependencies.passwordHasher.hash(validatePassword(input.newPassword));
  const now = dependencies.clock.now().toISOString();
  await dependencies.users.updatePasswordAndRevokeSessions(userId, passwordHash, now);
}

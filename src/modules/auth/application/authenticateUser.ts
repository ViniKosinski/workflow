import type { AuthApplicationDependencies, AuthResult, SessionMetadata } from "@/modules/auth/application/authApplicationTypes";
import { InvalidCredentialsError } from "@/modules/auth/application/authErrors";
import { createSession } from "@/modules/auth/application/createSession";
import { validateEmail } from "@/modules/auth/application/authValidation";
import { USER_STATUSES } from "@/modules/auth/domain/user";

export async function authenticateUser(
  dependencies: AuthApplicationDependencies,
  input: Readonly<{ email: string; password: string }>,
  metadata?: SessionMetadata,
): Promise<AuthResult> {
  const normalizedEmail = validateEmail(input.email);
  const record = await dependencies.users.findByNormalizedEmail(normalizedEmail);

  if (!record || record.user.status !== USER_STATUSES.active) {
    await dependencies.passwordHasher.verify(dependencies.dummyPasswordHash, input.password);
    throw new InvalidCredentialsError();
  }

  const valid = await dependencies.passwordHasher.verify(record.passwordHash, input.password);
  if (!valid) throw new InvalidCredentialsError();

  return createSession(dependencies, record.user, metadata);
}

import type { AuthApplicationDependencies } from "@/modules/auth/application/authApplicationTypes";
import { validateEmail, validateName, validatePassword } from "@/modules/auth/application/authValidation";
import { USER_STATUSES } from "@/modules/auth/domain/user";

export async function registerUser(
  dependencies: AuthApplicationDependencies,
  input: Readonly<{ name: string; email: string; password: string }>,
): Promise<void> {
  const name = validateName(input.name);
  const normalizedEmail = validateEmail(input.email);
  const password = validatePassword(input.password);

  const now = dependencies.clock.now().toISOString();
  const passwordHash = await dependencies.passwordHasher.hash(password);

  try {
    await dependencies.users.create({
      id: dependencies.ids.createUserId(),
      email: normalizedEmail,
      normalizedEmail,
      name,
      status: USER_STATUSES.active,
      passwordHash,
      now,
    });
  } catch (error) {
    if (await dependencies.users.findByNormalizedEmail(normalizedEmail)) {
      return;
    }
    throw error;
  }
}

import type { AuthApplicationDependencies } from "@/modules/auth/application/authApplicationTypes";
import { validateName } from "@/modules/auth/application/authValidation";

export function updateCurrentUserProfile(
  dependencies: AuthApplicationDependencies,
  userId: string,
  input: Readonly<{ name: string }>,
) {
  return dependencies.users.updateName(userId, validateName(input.name), dependencies.clock.now().toISOString());
}

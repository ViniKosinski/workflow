import { redirect } from "next/navigation";
import { UnauthenticatedError } from "@/modules/auth/application/authErrors";
import { getAuthenticatedUser } from "@/modules/auth/application/getAuthenticatedUser";
import { authDependencies } from "@/modules/auth/authDependencies";
import { readSessionToken } from "@/modules/auth/infrastructure/sessionCookie";

export async function resolveAuthenticatedUser() {
  return getAuthenticatedUser(authDependencies, await readSessionToken());
}

export async function getOptionalAuthenticatedUser() {
  try {
    return await resolveAuthenticatedUser();
  } catch (error) {
    if (error instanceof UnauthenticatedError) return null;
    throw error;
  }
}

export async function requireAuthenticatedPageUser(returnTo = "/") {
  try {
    return await resolveAuthenticatedUser();
  } catch (error) {
    if (error instanceof UnauthenticatedError) {
      redirect(`/login?next=${encodeURIComponent(returnTo)}`);
    }
    throw error;
  }
}

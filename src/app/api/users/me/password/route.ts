import { NextResponse } from "next/server";
import { changePassword } from "@/modules/auth/application/changePassword";
import { authDependencies } from "@/modules/auth/authDependencies";
import { parseJsonObject, requireString, validateMutationRequest } from "@/shared/presentation/api/httpRequest";
import { clearSessionCookie } from "@/modules/auth/infrastructure/sessionCookie";
import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { authErrorResponse } from "@/modules/auth/presentation/api/authApiResponses";

export async function POST(request: Request) {
  try {
    validateMutationRequest(request);
    const user = await resolveAuthenticatedUser();
    const body = await parseJsonObject(request);
    await changePassword(authDependencies, user.userId, {
      currentPassword: requireString(body, "currentPassword", 128),
      newPassword: requireString(body, "newPassword", 128),
    });
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

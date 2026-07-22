import { NextResponse } from "next/server";
import { updateCurrentUserProfile } from "@/modules/auth/application/updateCurrentUserProfile";
import { authDependencies } from "@/modules/auth/authDependencies";
import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { authErrorResponse } from "@/modules/auth/presentation/api/authApiResponses";
import { parseJsonObject, requireString, validateMutationRequest } from "@/shared/presentation/api/httpRequest";

export async function GET() {
  try {
    return NextResponse.json({ user: await resolveAuthenticatedUser() });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    validateMutationRequest(request);
    const current = await resolveAuthenticatedUser();
    const body = await parseJsonObject(request);
    const user = await updateCurrentUserProfile(authDependencies, current.userId, { name: requireString(body, "name", 160) });
    return NextResponse.json({ user: { userId: user.id, email: user.email, name: user.name } });
  } catch (error) {
    return authErrorResponse(error);
  }
}

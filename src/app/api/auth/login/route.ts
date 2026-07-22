import { NextResponse } from "next/server";
import { authenticateUser } from "@/modules/auth/application/authenticateUser";
import { authDependencies } from "@/modules/auth/authDependencies";
import { enforceAuthRateLimit, getTrustedRequestMetadata } from "@/modules/auth/presentation/api/rateLimit";
import { writeSessionCookie } from "@/modules/auth/infrastructure/sessionCookie";
import { authErrorResponse } from "@/modules/auth/presentation/api/authApiResponses";
import { parseJsonObject, requireString, validateMutationRequest } from "@/shared/presentation/api/httpRequest";

export async function POST(request: Request) {
  try {
    validateMutationRequest(request);
    const body = await parseJsonObject(request);
    const email = requireString(body, "email", 320);
    await enforceAuthRateLimit(authDependencies, request, "login", email, 10);
    const result = await authenticateUser(authDependencies, {
      email,
      password: requireString(body, "password", 128),
    }, getTrustedRequestMetadata(request));
    await writeSessionCookie(result.sessionToken, result.expiresAt);
    return NextResponse.json({ user: result.user });
  } catch (error) {
    return authErrorResponse(error);
  }
}

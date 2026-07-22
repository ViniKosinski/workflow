import { NextResponse } from "next/server";
import { logoutUser } from "@/modules/auth/application/logoutUser";
import { authDependencies } from "@/modules/auth/authDependencies";
import { validateMutationRequest } from "@/shared/presentation/api/httpRequest";
import { clearSessionCookie, readSessionToken } from "@/modules/auth/infrastructure/sessionCookie";
import { authErrorResponse } from "@/modules/auth/presentation/api/authApiResponses";

export async function POST(request: Request) {
  try {
    validateMutationRequest(request);
    await logoutUser(authDependencies, await readSessionToken());
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}

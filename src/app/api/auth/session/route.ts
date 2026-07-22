import { NextResponse } from "next/server";
import { resolveAuthenticatedUser } from "@/modules/auth/presentation/server/authenticatedUser";
import { authErrorResponse } from "@/modules/auth/presentation/api/authApiResponses";

export async function GET() {
  try {
    return NextResponse.json({ user: await resolveAuthenticatedUser() });
  } catch (error) {
    return authErrorResponse(error);
  }
}

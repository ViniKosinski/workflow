import { NextResponse } from "next/server";
import { registerUser } from "@/modules/auth/application/registerUser";
import { authDependencies } from "@/modules/auth/authDependencies";
import { enforceAuthRateLimit } from "@/modules/auth/presentation/api/rateLimit";
import { authErrorResponse } from "@/modules/auth/presentation/api/authApiResponses";
import { parseJsonObject, requireString, validateMutationRequest } from "@/shared/presentation/api/httpRequest";

export async function POST(request: Request) {
  try {
    validateMutationRequest(request);
    const body = await parseJsonObject(request);
    const email = requireString(body, "email", 320);
    await enforceAuthRateLimit(authDependencies, request, "register", email, 5);
    await registerUser(authDependencies, {
      name: requireString(body, "name", 160),
      email,
      password: requireString(body, "password", 128),
    });
    return NextResponse.json({ message: "Se o e-mail estiver disponível, a conta será criada." }, { status: 202 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = process.env.NODE_ENV === "production"
  ? "__Host-workflow_session"
  : "workflow_session";

export async function readSessionToken() {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value;
}

export async function writeSessionCookie(token: string, expiresAt: string) {
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    priority: "high",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    priority: "high",
    path: "/",
    expires: new Date(0),
  });
}

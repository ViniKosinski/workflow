import { cookies } from "next/headers";

export const ACTIVE_ORGANIZATION_COOKIE = "active_organization_id";

export async function getActiveOrganizationId(fallbackUserId: string) {
  const value = (await cookies()).get(ACTIVE_ORGANIZATION_COOKIE)?.value?.trim();
  return value && value.length <= 64 ? value : fallbackUserId;
}

export const USER_STATUSES = {
  active: "active",
  disabled: "disabled",
} as const;

export type UserStatus = (typeof USER_STATUSES)[keyof typeof USER_STATUSES];

export type User = Readonly<{
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}>;

export type AuthenticatedUser = Readonly<{
  userId: string;
  email: string;
  name: string;
}>;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

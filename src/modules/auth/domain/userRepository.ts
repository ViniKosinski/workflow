import type { User, UserStatus } from "@/modules/auth/domain/user";

export type UserWithCredential = Readonly<{
  user: User;
  passwordHash: string;
}>;

export type CreateUserRecord = Readonly<{
  id: string;
  email: string;
  normalizedEmail: string;
  name: string;
  status: UserStatus;
  passwordHash: string;
  now: string;
}>;

export type UserRepository = Readonly<{
  create: (record: CreateUserRecord) => Promise<User>;
  findByNormalizedEmail: (email: string) => Promise<UserWithCredential | null>;
  findCredentialByUserId: (userId: string) => Promise<string | null>;
  updateName: (userId: string, name: string, now: string) => Promise<User>;
  updatePasswordAndRevokeSessions: (userId: string, passwordHash: string, now: string) => Promise<void>;
}>;

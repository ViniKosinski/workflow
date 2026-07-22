import type { CreateUserRecord } from "@/modules/auth/domain/userRepository";

export type AccountProvisioningRepository = Readonly<{
  provision: (record: CreateUserRecord) => Promise<void>;
}>;

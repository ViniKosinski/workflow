import { hash, verify } from "@node-rs/argon2";
import type { PasswordHasher } from "@/modules/auth/domain/authServices";

const ARGON2ID_ALGORITHM = 2;

export const argonPasswordHasher: PasswordHasher = {
  hash: (password) =>
    hash(password, {
      algorithm: ARGON2ID_ALGORITHM,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
      outputLen: 32,
    }),
  verify: (passwordHash, password) => verify(passwordHash, password),
};

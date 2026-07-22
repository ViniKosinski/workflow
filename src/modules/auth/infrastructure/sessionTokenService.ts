import { createHash, randomBytes } from "node:crypto";
import type { SessionTokenService } from "@/modules/auth/domain/authServices";

export const sessionTokenService: SessionTokenService = {
  create: () => randomBytes(32).toString("base64url"),
  hash: (token) => createHash("sha256").update(token).digest("hex"),
};

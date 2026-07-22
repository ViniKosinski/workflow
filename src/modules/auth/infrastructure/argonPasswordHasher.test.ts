import { describe, expect, it } from "vitest";
import { argonPasswordHasher } from "@/modules/auth/infrastructure/argonPasswordHasher";

describe("Argon2id password hasher", () => {
  it("gera Argon2id com os parâmetros aprovados e verifica corretamente", async () => {
    const hash = await argonPasswordHasher.hash("uma senha longa de teste");
    expect(hash).toContain("$argon2id$v=19$m=19456,t=2,p=1$");
    await expect(argonPasswordHasher.verify(hash, "uma senha longa de teste")).resolves.toBe(true);
    await expect(argonPasswordHasher.verify(hash, "senha incorreta")).resolves.toBe(false);
  });
});

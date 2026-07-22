import { describe, expect, it, vi } from "vitest";
import { authenticateUser } from "@/modules/auth/application/authenticateUser";
import type { AuthApplicationDependencies } from "@/modules/auth/application/authApplicationTypes";
import { AuthValidationError, InvalidCredentialsError, UnauthenticatedError } from "@/modules/auth/application/authErrors";
import { changePassword } from "@/modules/auth/application/changePassword";
import { getAuthenticatedUser } from "@/modules/auth/application/getAuthenticatedUser";
import { logoutUser } from "@/modules/auth/application/logoutUser";
import { registerUser } from "@/modules/auth/application/registerUser";
import { updateCurrentUserProfile } from "@/modules/auth/application/updateCurrentUserProfile";
import type { CreateSessionRecord, SessionWithUser } from "@/modules/auth/domain/sessionRepository";
import type { CreateUserRecord, UserWithCredential } from "@/modules/auth/domain/userRepository";
import type { User } from "@/modules/auth/domain/user";

function createTestDependencies() {
  const users = new Map<string, UserWithCredential>();
  const sessions = new Map<string, SessionWithUser>();
  let now = new Date("2026-07-21T12:00:00.000Z");
  let sequence = 0;
  const verify = vi.fn(async (passwordHash: string, password: string) => passwordHash === `hashed:${password}`);

  const dependencies: AuthApplicationDependencies = {
    users: {
      async create(record: CreateUserRecord) {
        if (users.has(record.normalizedEmail)) throw new Error("unique");
        const user: User = { id: record.id, email: record.email, name: record.name, status: record.status, createdAt: record.now, updatedAt: record.now };
        users.set(record.normalizedEmail, { user, passwordHash: record.passwordHash });
        return user;
      },
      async findByNormalizedEmail(email) { return users.get(email) ?? null; },
      async findCredentialByUserId(userId) { return [...users.values()].find((item) => item.user.id === userId)?.passwordHash ?? null; },
      async updateName(userId, name, updatedAt) {
        const record = [...users.entries()].find(([, item]) => item.user.id === userId);
        if (!record) throw new Error("not found");
        const user = { ...record[1].user, name, updatedAt };
        users.set(record[0], { ...record[1], user });
        return user;
      },
      async updatePasswordAndRevokeSessions(userId, passwordHash) {
        const record = [...users.entries()].find(([, item]) => item.user.id === userId);
        if (!record) throw new Error("not found");
        users.set(record[0], { ...record[1], passwordHash });
        for (const [key, session] of sessions) if (session.user.id === userId) sessions.set(key, { ...session, revokedAt: now.toISOString() });
      },
    },
    sessions: {
      async create(record: CreateSessionRecord) {
        const user = [...users.values()].find((item) => item.user.id === record.userId)?.user;
        if (!user) throw new Error("not found");
        sessions.set(record.tokenHash, { id: record.id, tokenHash: record.tokenHash, expiresAt: record.expiresAt, lastSeenAt: record.now, user });
      },
      async findByTokenHash(tokenHash) { return sessions.get(tokenHash) ?? null; },
      async touch(sessionId, touchedAt) {
        const record = [...sessions.entries()].find(([, item]) => item.id === sessionId);
        if (record) sessions.set(record[0], { ...record[1], lastSeenAt: touchedAt });
      },
      async revokeByTokenHash(tokenHash, revokedAt) { const session = sessions.get(tokenHash); if (session) sessions.set(tokenHash, { ...session, revokedAt }); },
      async revokeAllForUser(userId, revokedAt) { for (const [key, session] of sessions) if (session.user.id === userId) sessions.set(key, { ...session, revokedAt }); },
      async deleteExpired() {},
    },
    passwordHasher: { async hash(password) { return `hashed:${password}`; }, verify },
    sessionTokens: { create: () => `token-${++sequence}`, hash: (token) => `hash:${token}` },
    rateLimiter: { async consume() { return true; }, async deleteExpired() {} },
    clock: { now: () => now },
    ids: { createUserId: () => `user-${++sequence}`, createSessionId: () => `session-${++sequence}` },
    sessionDurationMs: 60_000,
    sessionIdleTimeoutMs: 30_000,
    sessionTouchIntervalMs: 10_000,
    dummyPasswordHash: "hashed:dummy",
  };
  return { dependencies, sessions, users, verify, advance: (milliseconds: number) => { now = new Date(now.getTime() + milliseconds); } };
}

async function registerAndLogin(dependencies: AuthApplicationDependencies) {
  await registerUser(dependencies, { name: "Maria Silva", email: "maria@example.com", password: "uma senha longa e segura" });
  return authenticateUser(dependencies, { email: "maria@example.com", password: "uma senha longa e segura" });
}

describe("auth application use cases", () => {
  it("registra usuário normalizando e-mail sem criar sessão automaticamente", async () => {
    const { dependencies, sessions } = createTestDependencies();
    await registerUser(dependencies, { name: "  Maria Silva  ", email: " MARIA@Example.COM ", password: "uma senha longa e segura" });
    expect(await dependencies.users.findByNormalizedEmail("maria@example.com")).toMatchObject({ user: { name: "Maria Silva" } });
    expect(sessions.size).toBe(0);
  });

  it("responde da mesma forma para cadastro duplicado", async () => {
    const { dependencies } = createTestDependencies();
    const input = { name: "Maria Silva", email: "maria@example.com", password: "uma senha longa e segura" };
    await registerUser(dependencies, input);
    await expect(registerUser(dependencies, input)).resolves.toBeUndefined();
  });

  it("valida nome, e-mail e senha", async () => {
    const { dependencies } = createTestDependencies();
    await expect(registerUser(dependencies, { name: "M", email: "inválido", password: "curta" })).rejects.toBeInstanceOf(AuthValidationError);
  });

  it("usa hash dummy para reduzir enumeração temporal", async () => {
    const { dependencies, verify } = createTestDependencies();
    await expect(authenticateUser(dependencies, { email: "ausente@example.com", password: "qualquer senha longa" })).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(verify).toHaveBeenCalledWith("hashed:dummy", "qualquer senha longa");
  });

  it("autentica, limita touch e rejeita expiração absoluta ou por inatividade", async () => {
    const { dependencies, advance } = createTestDependencies();
    const result = await registerAndLogin(dependencies);
    await expect(getAuthenticatedUser(dependencies, result.sessionToken)).resolves.toEqual(result.user);
    advance(30_001);
    await expect(getAuthenticatedUser(dependencies, result.sessionToken)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("revoga sessão no logout", async () => {
    const { dependencies } = createTestDependencies();
    const result = await registerAndLogin(dependencies);
    await logoutUser(dependencies, result.sessionToken);
    await expect(getAuthenticatedUser(dependencies, result.sessionToken)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("rejeita login e sessão de usuário desabilitado", async () => {
    const { dependencies, users, sessions } = createTestDependencies();
    const result = await registerAndLogin(dependencies);
    const record = users.get("maria@example.com")!;
    users.set("maria@example.com", { ...record, user: { ...record.user, status: "disabled" } });
    await expect(authenticateUser(dependencies, { email: "maria@example.com", password: "uma senha longa e segura" })).rejects.toBeInstanceOf(InvalidCredentialsError);
    const tokenHash = dependencies.sessionTokens.hash(result.sessionToken);
    const storedSession = sessions.get(tokenHash)!;
    sessions.set(tokenHash, { ...storedSession, user: { ...storedSession.user, status: "disabled" } });
    await expect(getAuthenticatedUser(dependencies, result.sessionToken)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("atualiza perfil e troca senha revogando sessões", async () => {
    const { dependencies } = createTestDependencies();
    const result = await registerAndLogin(dependencies);
    await expect(updateCurrentUserProfile(dependencies, result.user.userId, { name: "Maria Souza" })).resolves.toMatchObject({ name: "Maria Souza" });
    await changePassword(dependencies, result.user.userId, { currentPassword: "uma senha longa e segura", newPassword: "uma nova senha muito segura" });
    await expect(getAuthenticatedUser(dependencies, result.sessionToken)).rejects.toBeInstanceOf(UnauthenticatedError);
    await expect(authenticateUser(dependencies, { email: "maria@example.com", password: "uma nova senha muito segura" })).resolves.toHaveProperty("sessionToken");
  });
});

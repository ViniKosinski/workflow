import { describe, expect, it, vi } from "vitest";

describe("PrismaWorkflowPersistenceRepository ownership", () => {
  it("limita listagem, busca e existência ao proprietário configurado", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
    const { PrismaWorkflowPersistenceRepository } = await import(
      "@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository"
    );
    const workflowRun = {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    };
    const prisma = { workflowRun };
    const repository = new PrismaWorkflowPersistenceRepository(
      "user-a",
      prisma as never,
    );

    await repository.list();
    await repository.findById("workflow-b");
    await repository.exists("workflow-b");

    expect(workflowRun.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ workflowDefinition: { ownerUserId: "user-a" } }),
    }));
    for (const call of workflowRun.findFirst.mock.calls) {
      expect(call[0].where).toMatchObject({ workflowDefinition: { ownerUserId: "user-a" } });
    }
  });

  it("rejeita save quando o identificador já pertence a qualquer usuário", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
    const { PrismaWorkflowPersistenceRepository } = await import("@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository");
    const transaction = { workflowDefinition: { findUnique: vi.fn().mockResolvedValue({ id: "shared-id" }) } };
    const prisma = { $transaction: vi.fn((callback) => callback(transaction)) };
    const repository = new PrismaWorkflowPersistenceRepository("user-b", prisma as never);
    await expect(repository.save({ id: "shared-id" } as never)).rejects.toThrow("already exists");
    expect(transaction.workflowDefinition.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "shared-id" } }));
  });

  it("interrompe update antes de qualquer mutação quando o proprietário diverge", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
    const { PrismaWorkflowPersistenceRepository } = await import("@/modules/workflows/infrastructure/prismaWorkflowPersistenceRepository");
    const transaction = {
      workflowRun: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() },
      workflowExecutionEvent: { deleteMany: vi.fn() },
      workflowRunStep: { deleteMany: vi.fn() },
      workflowDefinitionStep: { deleteMany: vi.fn() },
    };
    const prisma = { $transaction: vi.fn((callback) => callback(transaction)) };
    const repository = new PrismaWorkflowPersistenceRepository("user-b", prisma as never);
    await expect(repository.update({ id: "workflow-a" } as never)).rejects.toThrow("not found");
    expect(transaction.workflowRun.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "workflow-a", workflowDefinition: { ownerUserId: "user-b" } } }));
    expect(transaction.workflowRun.update).not.toHaveBeenCalled();
    expect(transaction.workflowExecutionEvent.deleteMany).not.toHaveBeenCalled();
  });
});

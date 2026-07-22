import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Uso: npm run workflows:reassign-legacy -- usuario@example.com");
  process.exitCode = 1;
} else if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não está configurada.");
  process.exitCode = 1;
} else {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const target = await prisma.user.findUnique({ where: { normalizedEmail: email }, select: { id: true, email: true } });
    if (!target) throw new Error("Usuário de destino não encontrado.");
    const result = await prisma.workflowDefinition.updateMany({
      where: { ownerUserId: "legacy-workflow-owner" },
      data: { ownerUserId: target.id },
    });
    console.log(`${result.count} workflow(s) legado(s) atribuído(s) a ${target.email}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Falha ao reassociar workflows.");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

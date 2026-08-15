import { hash } from "@node-rs/argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const passwordHash = await hash("CompraTeste123!", { algorithm: 2, memoryCost: 19_456, timeCost: 2, parallelism: 1, outputLen: 32 });
const now = new Date();
const users = [
  { id: "purchase-owner", email: "gestor@compras.test", name: "Gestora de Compras", role: "OWNER" },
  { id: "purchase-requester", email: "solicitante@compras.test", name: "Solicitante", role: "EDITOR" },
  { id: "purchase-approver", email: "aprovador@compras.test", name: "Aprovador", role: "ADMIN" },
];

await prisma.$transaction(async (tx) => {
  const pilotDefinitions = await tx.workflowDefinition.findMany({ where: { organizationId: "purchase-pilot" }, select: { id: true } });
  await tx.workflowRun.deleteMany({ where: { workflowDefinitionId: { in: pilotDefinitions.map((definition) => definition.id) } } });
  await tx.workflowDefinition.deleteMany({ where: { organizationId: "purchase-pilot" } });
  await tx.organization.deleteMany({ where: { id: { in: ["purchase-pilot", ...users.map((user) => user.id)] } } });
  await tx.user.deleteMany({ where: { id: { in: users.map((user) => user.id) } } });
  for (const user of users) {
    await tx.user.create({ data: { id: user.id, email: user.email, normalizedEmail: user.email, name: user.name, status: "ACTIVE", createdAt: now, updatedAt: now, credential: { create: { passwordHash, createdAt: now, updatedAt: now } } } });
    await tx.organization.create({ data: { id: user.id, name: `Espaço de ${user.name}`, memberships: { create: { userId: user.id, role: "OWNER" } } } });
  }
  await tx.organization.create({ data: { id: "purchase-pilot", name: "Compras Piloto", memberships: { create: users.map((user) => ({ userId: user.id, role: user.role })) } } });
});
await prisma.$disconnect();
console.log("Piloto criado. Senha dos usuários: CompraTeste123!");

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/env.js";

let prisma: PrismaClient | null = null;

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({ url: env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  prisma ??= createPrismaClient();
  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (!prisma) return;
  await prisma.$disconnect();
  prisma = null;
}

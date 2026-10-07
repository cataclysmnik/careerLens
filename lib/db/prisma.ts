import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  databaseUrl: string | undefined
}

if (process.env.NODE_ENV !== 'production' && globalForPrisma.databaseUrl !== process.env.DATABASE_URL) {
  if (globalForPrisma.prisma) {
    globalForPrisma.prisma.$disconnect().catch(() => {})
  }
  globalForPrisma.prisma = undefined
  globalForPrisma.databaseUrl = process.env.DATABASE_URL
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
  globalForPrisma.databaseUrl = process.env.DATABASE_URL
}

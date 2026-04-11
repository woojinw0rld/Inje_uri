/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: Pool;
};

function getPrismaClient() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize PrismaClient.');
  }

  const pool = globalForPrisma.prismaPool ?? new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter } as any);

  globalForPrisma.prismaPool = pool;
  globalForPrisma.prisma = client;
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient() as any;
    const value = client[property];

    if (typeof value === 'function') {
      return value.bind(client);
    }

    return value;
  },
});

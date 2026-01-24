/**
 * Prisma Client Factory
 * Supports dual-schema approach: Postgres (production) and SQLite (tests)
 * 
 * The approach works by:
 * 1. Generating clients from different schema files (schema.postgres.prisma vs schema.sqlite.prisma)
 * 2. Only one client is generated at a time based on PRISMA_SCHEMA_TARGET
 * 3. The generated client is always @prisma/client, but configured for the selected schema
 * 
 * Usage:
 * - Production: Uses Postgres schema (default)
 * - Tests: Set PRISMA_SCHEMA_TARGET=sqlite to use SQLite schema
 * 
 * Important: Generate the appropriate client before use:
 * - For SQLite: npm run prisma:generate:sqlite
 * - For Postgres: npm run prisma:generate:pg
 */

type PrismaClient = any;

let prisma: PrismaClient | null = null;

/**
 * Get Prisma client instance
 * Uses @prisma/client which is configured for whichever schema was generated last
 * 
 * Note: You must generate the appropriate client before use:
 * - For SQLite: npm run prisma:generate:sqlite
 * - For Postgres: npm run prisma:generate:pg
 */
export function getPrismaClient(): PrismaClient {
  if (prisma) {
    return prisma;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  try {
    // Import the generated Prisma client
    // The client will be configured for whichever schema was generated last
    const { PrismaClient: Client } = require('@prisma/client');
    
    prisma = new Client({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });

    return prisma;
  } catch (error: any) {
    const schemaTarget = process.env.PRISMA_SCHEMA_TARGET || 'postgres';
    throw new Error(
      `Failed to initialize Prisma client: ${error.message}. ` +
      `Make sure to run the appropriate generate command: ` +
      (schemaTarget === 'sqlite' 
        ? `'npm run prisma:generate:sqlite'`
        : `'npm run prisma:generate:pg'`)
    );
  }
}

/**
 * Disconnect Prisma client
 */
export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

// Export singleton instance
export { prisma };


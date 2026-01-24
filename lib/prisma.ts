/**
 * Prisma Client Factory
 * Supports dual-schema approach: Postgres (production) and SQLite (tests)
 * 
 * Usage:
 * - Production: Uses Postgres client by default
 * - Tests: Set PRISMA_SCHEMA_TARGET=sqlite to use SQLite client
 */

type PrismaClient = any;

let prisma: PrismaClient | null = null;

/**
 * Get Prisma client instance
 * Selects the appropriate client based on PRISMA_SCHEMA_TARGET environment variable
 * 
 * - Default (production): Uses Postgres client
 * - PRISMA_SCHEMA_TARGET=sqlite: Uses SQLite client
 */
export function getPrismaClient(): PrismaClient {
  if (prisma) {
    return prisma;
  }

  const schemaTarget = process.env.PRISMA_SCHEMA_TARGET || 'postgres';
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  try {
    if (schemaTarget === 'sqlite') {
      // Try to use SQLite client from custom output path
      try {
        const sqliteClientPath = require.resolve('@prisma/sqlite-client');
        const { PrismaClient: SQLiteClient } = require(sqliteClientPath);
        prisma = new SQLiteClient({
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        });
        return prisma;
      } catch {
        // Fall through to default client
      }
    } else {
      // Try to use Postgres client from custom output path
      try {
        const postgresClientPath = require.resolve('@prisma/postgres-client');
        const { PrismaClient: PostgresClient } = require(postgresClientPath);
        prisma = new PostgresClient({
          datasources: {
            db: {
              url: databaseUrl,
            },
          },
        });
        return prisma;
      } catch {
        // Fall through to default client
      }
    }

    // Fallback: use default @prisma/client (will use whichever schema was generated last)
    const { PrismaClient: DefaultClient } = require('@prisma/client');
    prisma = new DefaultClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
    return prisma;
  } catch (error: any) {
    throw new Error(
      `Failed to initialize Prisma client: ${error.message}. ` +
      `Make sure to run 'npm run prisma:generate' to generate the appropriate client. ` +
      `For SQLite tests, use 'PRISMA_SCHEMA_TARGET=sqlite npm run prisma:generate:sqlite'. ` +
      `For Postgres, use 'PRISMA_SCHEMA_TARGET=postgres npm run prisma:generate:pg'.`
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


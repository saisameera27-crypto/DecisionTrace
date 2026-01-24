/**
 * Prisma Client Factory
 * Supports dual-schema approach: Postgres (production) and SQLite (tests)
 * 
 * Usage:
 * - Production: Uses Postgres client by default
 * - Tests: Set PRISMA_SCHEMA_TARGET=sqlite to use SQLite client
 */

import type { PrismaClient as PostgresPrismaClient } from '@prisma/postgres-client';
import type { PrismaClient as SQLitePrismaClient } from '@prisma/sqlite-client';

type PrismaClient = PostgresPrismaClient | SQLitePrismaClient;

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
      // Use SQLite client
      const { PrismaClient: SQLiteClient } = require('@prisma/sqlite-client');
      prisma = new SQLiteClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });
    } else {
      // Use Postgres client (default)
      const { PrismaClient: PostgresClient } = require('@prisma/postgres-client');
      prisma = new PostgresClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });
    }

    return prisma;
  } catch (error: any) {
    // Fallback: try to use default @prisma/client if specific clients aren't available
    try {
      const { PrismaClient: DefaultClient } = require('@prisma/client');
      prisma = new DefaultClient({
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });
      return prisma;
    } catch (fallbackError: any) {
      throw new Error(
        `Failed to initialize Prisma client: ${error.message}. ` +
        `Fallback also failed: ${fallbackError.message}. ` +
        `Make sure to run 'npm run prisma:generate' to generate both clients.`
      );
    }
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


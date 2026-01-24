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
 * Database initialization error type
 */
export interface DBInitError {
  code: 'DB_INIT_ERROR';
  message: string;
  hint: string;
}

/**
 * Check if an error is a database initialization error
 */
export function isDBInitError(error: any): error is DBInitError {
  return error && error.code === 'DB_INIT_ERROR';
}

/**
 * Create a database initialization error response
 */
export function createDBInitError(message: string, hint: string): DBInitError {
  return {
    code: 'DB_INIT_ERROR',
    message,
    hint,
  };
}

/**
 * Get Prisma client instance with error handling
 * Uses @prisma/client which is configured for whichever schema was generated last
 * 
 * Note: You must generate the appropriate client before use:
 * - For SQLite: npm run prisma:generate:sqlite
 * - For Postgres: npm run prisma:generate:pg
 * 
 * @throws {DBInitError} If Prisma client initialization fails
 */
export function getPrismaClient(): PrismaClient {
  if (prisma) {
    return prisma;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw createDBInitError(
      'DATABASE_URL environment variable is not set',
      'Set DATABASE_URL to your database connection string (e.g., postgresql://user:pass@host:5432/db or file:/path/to/db.sqlite)'
    );
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
    const errorMessage = error.message || 'Unknown error';
    
    // Determine hint based on error type
    let hint = 'Check your DATABASE_URL and ensure the database is accessible';
    
    if (errorMessage.includes('Cannot find module') || errorMessage.includes('@prisma/client')) {
      hint = `Run 'npm run prisma:generate${schemaTarget === 'sqlite' ? ':sqlite' : ':pg'}' to generate the Prisma client`;
    } else if (errorMessage.includes('P1001') || errorMessage.includes('connection')) {
      hint = 'Verify your database is running and DATABASE_URL is correct';
    } else if (errorMessage.includes('P1003') || errorMessage.includes('database')) {
      hint = 'Ensure the database exists and is accessible with the provided credentials';
    } else if (errorMessage.includes('schema') || errorMessage.includes('migration')) {
      hint = `Run 'npm run prisma:migrate${schemaTarget === 'sqlite' ? ':sqlite' : ':pg'}' to apply database migrations`;
    }
    
    throw createDBInitError(
      `Failed to initialize Prisma client: ${errorMessage}`,
      hint
    );
  }
}

/**
 * Test database connection
 * @throws {DBInitError} If connection test fails
 */
export async function testDBConnection(): Promise<void> {
  const client = getPrismaClient();
  
  try {
    await client.$connect();
    await client.$disconnect();
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown connection error';
    let hint = 'Check your DATABASE_URL and ensure the database is accessible';
    
    if (errorMessage.includes('P1001') || errorMessage.includes('connection')) {
      hint = 'Verify your database is running and DATABASE_URL is correct';
    } else if (errorMessage.includes('P1003') || errorMessage.includes('database')) {
      hint = 'Ensure the database exists and is accessible with the provided credentials';
    } else if (errorMessage.includes('timeout')) {
      hint = 'Database connection timed out. Check network connectivity and database status';
    }
    
    throw createDBInitError(
      `Database connection failed: ${errorMessage}`,
      hint
    );
  }
}

/**
 * Wrap a function that uses Prisma with error handling
 * Catches DB initialization errors and converts them to proper error responses
 */
export async function withDBErrorHandling<T>(
  fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
  try {
    const client = getPrismaClient();
    return await fn(client);
  } catch (error: any) {
    if (isDBInitError(error)) {
      throw error;
    }
    // Re-throw other errors as-is
    throw error;
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

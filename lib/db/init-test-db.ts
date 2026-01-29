/**
 * Test Database Initialization
 * 
 * Provides reusable functions for initializing test databases in integration tests.
 * Handles SQLite database setup: directory creation, schema sync, and optional seeding.
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export interface InitTestDBOptions {
  /**
   * Database file path (relative or absolute)
   * Default: ./tmp/test-decision-trace.db
   */
  dbPath?: string;
  
  /**
   * Schema file to use
   * Default: prisma/schema.sqlite.prisma
   */
  schemaFile?: string;
  
  /**
   * Whether to seed the database after initialization
   * Default: false
   */
  seed?: boolean;
  
  /**
   * Custom environment variables to pass to Prisma commands
   */
  env?: Record<string, string>;
}

/**
 * Initialize test database for integration tests
 * 
 * Performs:
 * 1. Creates tmp directory if it doesn't exist
 * 2. Sets DATABASE_URL and PRISMA_SCHEMA_TARGET environment variables
 * 3. Generates Prisma client for SQLite schema
 * 4. Pushes schema to database (creates tables)
 * 5. Optionally seeds database with demo data
 * 
 * @param options - Configuration options
 * @returns Object with dbPath, dbUrl, and success status
 */
export async function initTestDB(options: InitTestDBOptions = {}): Promise<{
  dbPath: string;
  dbUrl: string;
  success: boolean;
  error?: string;
}> {
  const {
    dbPath = path.join(process.cwd(), 'tmp', 'test-decision-trace.db'),
    schemaFile = 'prisma/schema.sqlite.prisma',
    seed = false,
    env = {},
  } = options;

  try {
    // Step 1: Ensure tmp directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`✅ Created test database directory: ${dbDir}`);
    }

    // Step 2: Set environment variables
    const dbUrl = `file:${dbPath}`;
    const testEnv = {
      ...process.env,
      DATABASE_URL: dbUrl,
      TEST_DATABASE_URL: dbUrl,
      PRISMA_SCHEMA_TARGET: 'sqlite',
      ...env,
    };

    console.log(`📦 Using test database: ${dbUrl}`);

    // Step 3: Generate Prisma client for SQLite
    try {
      console.log('🔄 Generating Prisma client for SQLite...');
      execSync(`npx prisma generate --schema=${schemaFile}`, {
        env: testEnv,
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('✅ Prisma client generated');
    } catch (error: any) {
      console.warn('⚠️  Prisma generate warning:', error.message);
      // Continue anyway - client might already be generated
    }

    // Step 4: Push schema to database (creates tables)
    try {
      console.log('🔄 Pushing Prisma schema to SQLite database...');
      execSync(`npx prisma db push --schema=${schemaFile} --accept-data-loss`, {
        env: testEnv,
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('✅ Database schema synced');
    } catch (error: any) {
      // Schema push might fail if there are issues
      console.warn('⚠️  Schema push warning:', error.message);
      return {
        dbPath,
        dbUrl,
        success: false,
        error: error.message,
      };
    }

    // Step 5: Optionally seed database
    if (seed) {
      try {
        console.log('🔄 Seeding test database...');
        execSync('npx tsx prisma/seed.ts', {
          env: testEnv,
          stdio: 'inherit',
          cwd: process.cwd(),
        });
        console.log('✅ Database seeded');
      } catch (error: any) {
        console.warn('⚠️  Seed warning (may be expected):', error.message);
        // Don't fail if seeding fails - it's optional
      }
    }

    // Verify database file was created
    if (!fs.existsSync(dbPath)) {
      return {
        dbPath,
        dbUrl,
        success: false,
        error: 'Database file was not created after schema push',
      };
    }

    return {
      dbPath,
      dbUrl,
      success: true,
    };
  } catch (error: any) {
    return {
      dbPath,
      dbUrl: `file:${dbPath}`,
      success: false,
      error: error.message || 'Unknown error during database initialization',
    };
  }
}

/**
 * Initialize test database with default e2e path
 * Convenience function for E2E tests
 */
export async function initE2ETestDB(options: Omit<InitTestDBOptions, 'dbPath'> = {}): Promise<{
  dbPath: string;
  dbUrl: string;
  success: boolean;
  error?: string;
}> {
  return initTestDB({
    ...options,
    dbPath: path.join(process.cwd(), 'tmp', 'e2e.db'),
  });
}


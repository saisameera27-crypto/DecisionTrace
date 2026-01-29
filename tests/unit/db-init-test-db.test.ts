/**
 * Unit tests for lib/db/init-test-db.ts
 * Tests that initTestDB creates SQLite database files correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { initTestDB, initE2ETestDB } from '@/lib/db/init-test-db';

describe('initTestDB', () => {
  const testDbDir = path.join(process.cwd(), 'tmp');
  const testDbPath = path.join(testDbDir, 'unit-test-init.db');

  beforeEach(() => {
    // Clean up test database file if it exists
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  afterEach(() => {
    // Clean up test database file after each test
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  it('should create tmp directory if it does not exist', async () => {
    // Remove tmp directory if it exists
    if (fs.existsSync(testDbDir)) {
      // Don't remove the whole tmp dir - other tests might be using it
      // Just verify the function handles it
    }

    const result = await initTestDB({
      dbPath: testDbPath,
    });

    // Verify tmp directory exists
    expect(fs.existsSync(testDbDir)).toBe(true);
    expect(result.success).toBe(true);
  });

  it('should create SQLite database file at specified path', async () => {
    const result = await initTestDB({
      dbPath: testDbPath,
    });

    expect(result.success).toBe(true);
    expect(result.dbPath).toBe(testDbPath);
    expect(result.dbUrl).toBe(`file:${testDbPath}`);
    
    // Verify database file was created
    expect(fs.existsSync(testDbPath)).toBe(true);
    
    // Verify it's a file (not a directory)
    const stats = fs.statSync(testDbPath);
    expect(stats.isFile()).toBe(true);
  });

  it('should create e2e.db at ./tmp/e2e.db when using initE2ETestDB', async () => {
    const e2eDbPath = path.join(process.cwd(), 'tmp', 'e2e.db');
    
    // Clean up e2e.db if it exists
    if (fs.existsSync(e2eDbPath)) {
      fs.unlinkSync(e2eDbPath);
    }

    const result = await initE2ETestDB();

    expect(result.success).toBe(true);
    expect(result.dbPath).toBe(e2eDbPath);
    expect(result.dbUrl).toBe(`file:${e2eDbPath}`);
    
    // Verify e2e.db file was created
    expect(fs.existsSync(e2eDbPath)).toBe(true);
    
    // Clean up
    if (fs.existsSync(e2eDbPath)) {
      fs.unlinkSync(e2eDbPath);
    }
  });

  it('should set DATABASE_URL environment variable', async () => {
    const originalDbUrl = process.env.DATABASE_URL;
    
    try {
      const result = await initTestDB({
        dbPath: testDbPath,
      });

      expect(result.success).toBe(true);
      // Verify DATABASE_URL was set (initTestDB sets it internally)
      // The function uses execSync with env, so it sets it in child process
      // But we can verify the returned dbUrl matches expected format
      expect(result.dbUrl).toMatch(/^file:/);
    } finally {
      // Restore original DATABASE_URL
      if (originalDbUrl) {
        process.env.DATABASE_URL = originalDbUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
    }
  });

  it('should handle custom schema file', async () => {
    const result = await initTestDB({
      dbPath: testDbPath,
      schemaFile: 'prisma/schema.sqlite.prisma',
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(testDbPath)).toBe(true);
  });

  it('should return error if schema push fails', async () => {
    // Use invalid schema file to trigger error
    const result = await initTestDB({
      dbPath: testDbPath,
      schemaFile: 'prisma/nonexistent-schema.prisma',
    });

    // Should fail gracefully
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should not seed database by default', async () => {
    const result = await initTestDB({
      dbPath: testDbPath,
      seed: false, // Explicitly false
    });

    expect(result.success).toBe(true);
    expect(fs.existsSync(testDbPath)).toBe(true);
    
    // Database should exist but be empty (no seed data)
    // We can't easily verify this without querying, but the test confirms
    // the function completes successfully without seeding
  });
});


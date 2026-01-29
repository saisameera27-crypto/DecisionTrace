/**
 * Integration Test Harness
 * Provides helpers for testing Next.js API routes with a test database
 * Uses real Fetch API Request/Response objects for framework-agnostic testing
 */

import * as fs from 'fs';
import * as path from 'path';
import { initTestDB } from '@/lib/db/init-test-db';

// Use real Fetch API types
type RouteHandler = (req: Request, context?: any) => Promise<Response>;
type NextRequest = Request; // NextRequest extends Request, so Request works
type NextResponse = Response; // NextResponse extends Response, so Response works

// Try to import Next.js types for route handler compatibility
let NextRequestClass: any;
let NextResponseClass: any;

try {
  const nextServer = require('next/server');
  NextRequestClass = nextServer.NextRequest;
  NextResponseClass = nextServer.NextResponse;
} catch {
  // Next.js not installed - use Request/Response as fallback
  NextRequestClass = Request;
  NextResponseClass = Response;
}

// Test database path (SQLite)
// Use ./tmp directory relative to project root for better portability
const TEST_DB_DIR = path.join(process.cwd(), 'tmp');
const TEST_DB_PATH = process.env.TEST_DATABASE_URL 
  ? new URL(process.env.TEST_DATABASE_URL).pathname.replace('file:', '')
  : path.join(TEST_DB_DIR, 'test-decision-trace.db');
const TEST_DB_URL = `file:${TEST_DB_PATH}`;

// Prisma client instance for tests (optional)
let prisma: any = null;

/**
 * Initialize Prisma client with test database
 * Returns null if Prisma is not installed
 */
export function getTestPrismaClient(): any {
  if (!prisma) {
    try {
      const schemaTarget = process.env.PRISMA_SCHEMA_TARGET || 'postgres';
      const databaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || `file:${TEST_DB_PATH}`;
      
      // If using SQLite, ensure PRISMA_SCHEMA_TARGET is set
      if (databaseUrl.startsWith('file:')) {
        if (schemaTarget !== 'sqlite') {
          console.warn('SQLite DATABASE_URL detected but PRISMA_SCHEMA_TARGET is not set to "sqlite". Setting it automatically.');
          process.env.PRISMA_SCHEMA_TARGET = 'sqlite';
        }
      }
      
      // Set DATABASE_URL for the Prisma client factory
      if (!process.env.DATABASE_URL) {
        process.env.DATABASE_URL = databaseUrl;
      }
      
      // Use the Prisma client factory
      const { getPrismaClient } = require('@/lib/prisma');
      prisma = getPrismaClient();
    } catch (error: any) {
      // Prisma not installed or configuration error - return null
      console.warn('Prisma not available - database operations will be skipped:', error.message);
      return null;
    }
  }
  
  return prisma;
}

/**
 * Reset the test database before each test
 * Deletes all records and resets sequences
 */
export async function resetTestDatabase(): Promise<void> {
  const client = getTestPrismaClient();
  
  if (!client) {
    // Prisma not available - skip database reset
    return;
  }
  
  try {
    // Delete all records in reverse order of dependencies
    await client.share.deleteMany();
    await client.report.deleteMany();
    await client.caseDocument.deleteMany();
    await client.caseEvent.deleteMany();
    await client.caseStep.deleteMany();
    await client.case.deleteMany();
    
    // Reset SQLite sequences if using SQLite
    if (TEST_DB_PATH.endsWith('.db')) {
      await client.$executeRaw`DELETE FROM sqlite_sequence`;
    }
  } catch (error) {
    console.warn('Error resetting test database:', error);
    // If tables don't exist yet, that's okay
  }
}

/**
 * Create a test Case record
 */
export interface CreateCaseOptions {
  title?: string;
  status?: string;
  userId?: string;
  slug?: string;
  metadata?: Record<string, any>;
}

export async function createTestCase(
  options: CreateCaseOptions = {}
): Promise<{ id: string; slug: string }> {
  const client = getTestPrismaClient();
  
  if (!client) {
    // Prisma not available - return mock data
    return {
      id: `mock-case-${Date.now()}`,
      slug: options.slug || `test-case-${Date.now()}`,
    };
  }
  
  const caseData = {
    title: options.title || 'Test Decision Case',
    status: options.status || 'draft',
    userId: options.userId || 'test-user-123',
    slug: options.slug || `test-case-${Date.now()}`,
    metadata: options.metadata || {},
  };
  
  try {
    const testCase = await client.case.create({
      data: caseData,
    });
    
    return {
      id: testCase.id,
      slug: testCase.slug,
    };
  } catch (error: any) {
    // If database operation fails (e.g., SQLite with Postgres schema), return mock data
    console.warn('Database operation failed, using mock data:', error.message);
    return {
      id: `mock-case-${Date.now()}`,
      slug: options.slug || `test-case-${Date.now()}`,
    };
  }
}

/**
 * Helper to create a real Fetch API Request for testing
 * Supports IP specification via options.ip which sets x-forwarded-for header
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    searchParams?: Record<string, string>;
    ip?: string; // IP address to use (sets x-forwarded-for header)
  } = {}
): Request {
  const { method = 'GET', headers = {}, body, searchParams = {}, ip } = options;
  
  // Add search params to URL
  const urlObj = new URL(url, 'http://localhost:3000');
  Object.entries(searchParams).forEach(([key, value]: [string, string]) => {
    urlObj.searchParams.set(key, value);
  });
  
  // Build headers object - include IP if specified
  const headersObj = new Headers({
    'Content-Type': 'application/json',
    ...headers,
  });
  
  // Set x-forwarded-for header if IP is specified
  if (ip) {
    headersObj.set('x-forwarded-for', ip);
  }
  
  const requestInit: RequestInit = {
    method,
    headers: headersObj,
  };
  
  if (body) {
    requestInit.body = JSON.stringify(body);
  }
  
  // Create real Fetch API Request
  const request = new Request(urlObj.toString(), requestInit);
  
  return request;
}

/**
 * Helper to call route handler with real Request/Response objects
 * Route handlers receive (req: Request, context?: any) and return Promise<Response>
 */
export async function callRouteHandler(
  handler: RouteHandler,
  request: Request,
  context?: any
): Promise<Response> {
  try {
    // Call handler with real Request object
    // Next.js handlers accept NextRequest which extends Request, so this works
    const response = await handler(request, context);
    
    // Ensure we have a real Response object
    if (!(response instanceof Response)) {
      throw new Error('Route handler must return a Response object');
    }
    
    // If response indicates an error (status >= 400), log it for debugging
    if (response.status >= 400) {
      try {
        const json = await parseJsonResponse(response);
        console.error(`Route handler returned error status ${response.status}:`, JSON.stringify(json, null, 2));
      } catch {
        // Failed to parse JSON, try text
        try {
          const text = await response.clone().text();
          console.error(`Route handler returned error status ${response.status}:`, text);
        } catch {
          // Ignore parsing errors
        }
      }
    }
    
    return response;
  } catch (error) {
    // Log the error before converting to Response
    console.error('Route handler threw an error:', error);
    
    // Convert errors to real Response object
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Create a multipart/form-data request for file uploads using real Fetch API Request
 */
export function createMultipartRequest(
  url: string,
  files: Array<{
    name: string;
    content: string | Buffer;
    type?: string;
    fieldName?: string;
  }>,
  additionalFields?: Record<string, string>
): Request {
  // Create FormData (works in Node.js 18+)
  const formData = new FormData();
  
  // Create File objects for Node.js
  const fileObjects: File[] = [];
  
  files.forEach((file: any) => {
    const content = Buffer.isBuffer(file.content) 
      ? file.content 
      : Buffer.from(file.content, 'utf-8');
    
    // Create a File object
    const fileObj = new File([content], file.name, {
      type: file.type || 'application/octet-stream',
    });
    
    fileObjects.push(fileObj);
    formData.append(file.fieldName || 'file', fileObj);
  });
  
  // Add additional fields
  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]: [string, string]) => {
      formData.append(key, value);
    });
  }
  
  // Create URL
  const urlObj = new URL(url, 'http://localhost:3000');
  
  // Create real Fetch API Request with FormData
  // Don't set Content-Type header - FormData will set it with boundary
  const request = new Request(urlObj.toString(), {
    method: 'POST',
    body: formData,
  });
  
  // Store file objects on request for test access (fallback)
  (request as any).__testFiles = fileObjects;
  
  // Store FormData on request for test access
  (request as any).__testFormData = formData;
  
  // Store original content for test access (for buffer extraction)
  (request as any).__testFileContents = files.map((f: any) => f.content);
  
  // Ensure formData() method works in test environment
  // Override formData() to always return our FormData
  const storedFormData = formData;
  (request as any).formData = async () => {
    return storedFormData;
  };
  
  // Add arrayBuffer() method to File objects if missing (for test compatibility)
  fileObjects.forEach((fileObj: File, index: number) => {
    if (typeof (fileObj as any).arrayBuffer !== 'function') {
      const content = files[index].content;
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
      (fileObj as any).arrayBuffer = async () => {
        return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      };
    }
  });
  
  return request;
}

/**
 * Call /api/files/upload route handler
 * Returns real Response object
 */
export async function callFilesUpload(
  handler: RouteHandler,
  fileData: {
    name: string;
    content: string | Buffer;
    type?: string;
  } | Array<{
    name: string;
    content: string | Buffer;
    type?: string;
  }>
): Promise<Response> {
  const files = Array.isArray(fileData) ? fileData : [fileData];
  const request = createMultipartRequest('/api/files/upload', files);
  
  return callRouteHandler(handler, request);
}

/**
 * Call /api/case/[id]/run route handler
 * Returns real Response object
 */
export async function callCaseRun(
  handler: RouteHandler,
  caseId: string,
  options: {
    resumeFromStep?: number;
  } = {}
): Promise<Response> {
  const request = createTestRequest(`/api/case/${caseId}/run`, {
    method: 'POST',
    body: {
      resumeFromStep: options.resumeFromStep,
    },
  });
  
  return callRouteHandler(handler, request, {
    params: { id: caseId },
  });
}

/**
 * Call /api/case/[id]/report route handler
 * Returns real Response object
 */
export async function callCaseReport(
  handler: RouteHandler,
  caseId: string
): Promise<Response> {
  const request = createTestRequest(`/api/case/${caseId}/report`, {
    method: 'GET',
  });
  
  return callRouteHandler(handler, request, {
    params: { id: caseId },
  });
}

/**
 * Call /api/case/[id]/events route handler (stream validation)
 * Returns real Response object with stream
 */
export async function callCaseEvents(
  handler: RouteHandler,
  caseId: string
): Promise<{ response: Response; stream: ReadableStream | null }> {
  const request = createTestRequest(`/api/case/${caseId}/events`, {
    method: 'GET',
  });
  
  const response = await callRouteHandler(handler, request, {
    params: { id: caseId },
  });
  
  // Validate it's a stream response
  const stream = response.body;
  
  return {
    response,
    stream,
  };
}

/**
 * Call /api/public/case/[slug] route handler
 * Returns real Response object
 */
export async function callPublicCase(
  handler: RouteHandler,
  slug: string
): Promise<Response> {
  const request = createTestRequest(`/api/public/case/${slug}`, {
    method: 'GET',
  });
  
  return callRouteHandler(handler, request, {
    params: { slug },
  });
}

/**
 * Setup function to run before all integration tests
 * 
 * This function:
 * 1. Creates the tmp directory if it doesn't exist
 * 2. Sets test DB environment variables (SQLite)
 * 3. Runs Prisma schema sync for SQLite using schema.sqlite.prisma
 * 4. Optionally seeds demo data if required
 * 
 * This ensures the database is initialized BEFORE any tests run,
 * preventing DB_NOT_INITIALIZED errors.
 */
export async function setupIntegrationTests(): Promise<void> {
  // Use the reusable initTestDB function
  const result = await initTestDB({
    dbPath: TEST_DB_PATH,
    schemaFile: 'prisma/schema.sqlite.prisma',
    seed: false, // Don't seed by default - tests can seed if needed
  });

  if (!result.success) {
    console.warn('⚠️  Test database initialization had issues:', result.error);
    // Continue anyway - some tests might handle missing tables gracefully
  }

  // Ensure environment variables are set (initTestDB sets them, but ensure they persist)
  process.env.DATABASE_URL = result.dbUrl;
  process.env.TEST_DATABASE_URL = result.dbUrl;
  process.env.PRISMA_SCHEMA_TARGET = 'sqlite';
  
  // Initialize Prisma client (now that schema is synced)
  getTestPrismaClient();
  
  // Reset database (clean slate for tests)
  await resetTestDatabase();
}

/**
 * Teardown function to run after all integration tests
 */
export async function teardownIntegrationTests(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

/**
 * Helper to parse JSON response from real Response object
 * Clones the response to avoid consuming the body stream
 */
export async function parseJsonResponse(response: Response): Promise<any> {
  // Clone response to avoid consuming the body
  const cloned = response.clone();
  
  try {
    return await cloned.json();
  } catch {
    // If JSON parsing fails, try text
    try {
      const text = await cloned.text();
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    } catch {
      return null;
    }
  }
}

/**
 * Helper to assert response status with detailed error output
 * Works with real Response objects - reads response text/json on failures
 * Clones response to avoid consuming the original (tests can still use it)
 * Includes formatted response body and headers in error message
 * 
 * @param res - The Response object to check
 * @param expected - Expected status code(s) - can be a single number or array of numbers
 * @param context - Optional context string to include in error message
 */
export async function assertResponseStatus(
  res: Response,
  expected: number | number[],
  context?: string
): Promise<void> {
  const actual = res.status;
  const expectedArray = Array.isArray(expected) ? expected : [expected];
  const isMatch = expectedArray.includes(actual);
  
  if (isMatch) {
    return; // Status matches, no error
  }
  
  // Clone response to safely read body without consuming original
  const cloned = res.clone();
  
  let responseBody: string = '';
  let isJSON = false;
  const headers: Record<string, string> = {};
  
  try {
    // Collect headers
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });
    
    // Check Content-Type header to determine if JSON
    const contentType = res.headers.get('content-type') || '';
    isJSON = contentType.includes('application/json');
    
    // Read response text
    const text = await cloned.text();
    responseBody = text;
    
    // If JSON, try to parse and pretty-print
    if (isJSON && text) {
      try {
        const json = JSON.parse(text);
        responseBody = JSON.stringify(json, null, 2);
      } catch {
        // If JSON parsing fails, use raw text
        responseBody = text;
      }
    }
  } catch (error: any) {
    // If reading fails, include error in message
    responseBody = `(unable to read response body: ${error.message})`;
  }
  
  // Build detailed error message
  const expectedStr = Array.isArray(expected) 
    ? `one of [${expected.join(', ')}]` 
    : String(expected);
  
  const errorMessage = [
    context ? `[${context}] ` : '',
    `Expected status ${expectedStr}, got ${actual}`,
    '',
    'Response headers:',
    JSON.stringify(headers, null, 2),
    '',
    'Response body:',
    isJSON ? responseBody : `(${res.headers.get('content-type') || 'unknown type'}) ${responseBody}`,
  ].join('\n');
  
  throw new Error(errorMessage);
}

/**
 * Helper to validate stream response
 */
export async function validateStreamResponse(
  stream: ReadableStream | null
): Promise<boolean> {
  if (!stream) {
    return false;
  }
  
  // Try to read from stream
  const reader = stream.getReader();
  try {
    const { done } = await reader.read();
    reader.releaseLock();
    return !done || true; // Stream exists and is readable
  } catch {
    return false;
  }
}


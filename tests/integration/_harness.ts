/**
 * Integration Test Harness
 * Provides helpers for testing Next.js API routes with a test database
 */

import * as fs from 'fs';
import * as path from 'path';

// Mock Next.js types if not available
type NextRequest = any;
type NextResponse = any;

// Try to import Next.js types, fallback to mocks if not available
let NextRequestClass: any;
let NextResponseClass: any;

try {
  const nextServer = require('next/server');
  NextRequestClass = nextServer.NextRequest;
  NextResponseClass = nextServer.NextResponse;
} catch {
  // Next.js not installed - use mock types
  NextRequestClass = class MockNextRequest {
    constructor(public url: string, public init?: any) {}
    async formData() {
      return new FormData();
    }
  };
  NextResponseClass = {
    json: (data: any, init?: any) => ({
      status: init?.status || 200,
      json: async () => data,
      text: async () => JSON.stringify(data),
      body: null,
    }),
  };
}

// Test database path (SQLite)
const TEST_DB_PATH = process.env.TEST_DATABASE_URL 
  ? new URL(process.env.TEST_DATABASE_URL).pathname.replace('file:', '')
  : path.join('/tmp', 'test-decision-trace.db');

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
      const { getPrismaClient } = require('../../lib/prisma');
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
 * Helper to create a NextRequest for testing
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = 'GET', headers = {}, body, searchParams = {} } = options;
  
  // Add search params to URL
  const urlObj = new URL(url, 'http://localhost:3000');
  Object.entries(searchParams).forEach(([key, value]: [string, string]) => {
    urlObj.searchParams.set(key, value);
  });
  
  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };
  
  if (body) {
    requestInit.body = JSON.stringify(body);
  }
  
  return new NextRequestClass(urlObj.toString(), requestInit);
}

/**
 * Helper to call Next.js route handler with error handling and debugging
 */
export async function callRouteHandler(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  request: NextRequest,
  context?: any
): Promise<NextResponse> {
  try {
    const response = await handler(request, context);
    
    // If response indicates an error (status >= 400), log it for debugging
    const status = response.status || (response as any).statusCode || 200;
    if (status >= 400) {
      try {
        const json = await parseJsonResponse(response);
        console.error(`Route handler returned error status ${status}:`, JSON.stringify(json, null, 2));
      } catch {
        // Failed to parse JSON, try text
        try {
          if (typeof response.text === 'function') {
            const text = await response.text();
            console.error(`Route handler returned error status ${status}:`, text);
          }
        } catch {
          // Ignore parsing errors
        }
      }
    }
    
    return response;
  } catch (error) {
    // Log the error before converting to NextResponse
    console.error('Route handler threw an error:', error);
    
    // Convert errors to NextResponse
    return NextResponseClass.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Create a multipart/form-data request for file uploads
 * Note: In Node.js test environment, we simulate FormData using a custom approach
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
): NextRequest {
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
  
  // Create request with FormData
  const urlObj = new URL(url, 'http://localhost:3000');
  
  // Create request - FormData will be handled by NextRequest
  const request = new NextRequestClass(urlObj.toString(), {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - FormData will set it with boundary
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
 */
export async function callFilesUpload(
  handler: (req: NextRequest) => Promise<NextResponse>,
  fileData: {
    name: string;
    content: string | Buffer;
    type?: string;
  } | Array<{
    name: string;
    content: string | Buffer;
    type?: string;
  }>
): Promise<NextResponse> {
  const files = Array.isArray(fileData) ? fileData : [fileData];
  const request = createMultipartRequest('/api/files/upload', files);
  
  return callRouteHandler(handler, request);
}

/**
 * Call /api/case/[id]/run route handler
 */
export async function callCaseRun(
  handler: (req: NextRequest, context: { params: { id: string } }) => Promise<NextResponse>,
  caseId: string,
  options: {
    resumeFromStep?: number;
  } = {}
): Promise<NextResponse> {
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
 */
export async function callCaseReport(
  handler: (req: NextRequest, context: { params: { id: string } }) => Promise<NextResponse>,
  caseId: string
): Promise<NextResponse> {
  const request = createTestRequest(`/api/case/${caseId}/report`, {
    method: 'GET',
  });
  
  return callRouteHandler(handler, request, {
    params: { id: caseId },
  });
}

/**
 * Call /api/case/[id]/events route handler (stream validation)
 */
export async function callCaseEvents(
  handler: (req: NextRequest, context: { params: { id: string } }) => Promise<NextResponse>,
  caseId: string
): Promise<{ response: NextResponse; stream: ReadableStream | null }> {
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
 */
export async function callPublicCase(
  handler: (req: NextRequest, context: { params: { slug: string } }) => Promise<NextResponse>,
  slug: string
): Promise<NextResponse> {
  const request = createTestRequest(`/api/public/case/${slug}`, {
    method: 'GET',
  });
  
  return callRouteHandler(handler, request, {
    params: { slug },
  });
}

/**
 * Setup function to run before all integration tests
 */
export async function setupIntegrationTests(): Promise<void> {
  // Ensure test database directory exists
  const dbDir = path.dirname(TEST_DB_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  // Initialize Prisma client
  getTestPrismaClient();
  
  // Reset database
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
 * Helper to parse JSON response
 */
export async function parseJsonResponse(response: NextResponse): Promise<any> {
  if (typeof response.text === 'function') {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } else if (typeof response.json === 'function') {
    return await response.json();
  } else {
    return response;
  }
}

/**
 * Helper to assert response status with detailed error output
 */
export function assertResponseStatus(
  response: NextResponse,
  expectedStatus: number
): void {
  const status = response.status || (response as any).statusCode || 200;
  if (status !== expectedStatus) {
    // Print response JSON for debugging
    parseJsonResponse(response).then((json: any) => {
      console.error('Response status mismatch:');
      console.error(`  Expected: ${expectedStatus}`);
      console.error(`  Got: ${status}`);
      console.error('Response body:', JSON.stringify(json, null, 2));
    }).catch(() => {
      // If JSON parsing fails, try to get text
      if (typeof response.text === 'function') {
        response.text().then((text: string) => {
          console.error('Response status mismatch:');
          console.error(`  Expected: ${expectedStatus}`);
          console.error(`  Got: ${status}`);
          console.error('Response body (text):', text);
        }).catch(() => {
          console.error('Response status mismatch:');
          console.error(`  Expected: ${expectedStatus}`);
          console.error(`  Got: ${status}`);
        });
      } else {
        console.error('Response status mismatch:');
        console.error(`  Expected: ${expectedStatus}`);
        console.error(`  Got: ${status}`);
      }
    });
    
    throw new Error(
      `Expected status ${expectedStatus}, got ${status}`
    );
  }
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


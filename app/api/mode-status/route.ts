import { NextResponse } from 'next/server';
import { isDemoMode, getDemoModeStatus } from '@/lib/demo-mode';
import { getPrismaClient } from '@/lib/prisma';

/**
 * Get current runtime status for UI display
 * Returns mode, Gemini status, and DB connection status
 */
export async function GET() {
  const status = getDemoModeStatus();
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  
  // Check DB connection with a trivial query
  let dbConnected = false;
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    dbConnected = true;
  } catch (error) {
    dbConnected = false;
  }
  
  return NextResponse.json({
    isDemoMode: status.enabled,
    hasApiKey,
    dbConnected,
    reason: status.reason,
  });
}


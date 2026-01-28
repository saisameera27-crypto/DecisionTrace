import { NextResponse } from 'next/server';
import { isDemoMode, getDemoModeStatus } from '@/lib/demo-mode';

/**
 * Get current mode status for UI display
 * Returns whether demo mode is enabled and if API key exists
 */
export async function GET() {
  const status = getDemoModeStatus();
  const hasApiKey = !!process.env.GEMINI_API_KEY;
  
  return NextResponse.json({
    isDemoMode: status.enabled,
    hasApiKey,
    reason: status.reason,
  });
}


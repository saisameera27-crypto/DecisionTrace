/**
 * Demo Mode Helper
 * Checks if demo mode is enabled and provides utilities for demo mode behavior
 * 
 * Demo mode is DEFAULT for production hackathon deployments:
 * - DEMO_MODE=true is explicitly set, OR
 * - No GEMINI_API_KEY is present (defaults to demo mode)
 * 
 * Demo mode provides:
 * - Instant "Load Sample Case" functionality
 * - Mock Gemini responses (no API calls)
 * - No database persistence required
 * - Perfect for hackathon judging
 * 
 * To use Live Gemini 3:
 * - Set GEMINI_API_KEY environment variable
 * - Demo mode will be disabled
 * - "Run Live Gemini 3" option will be available
 */

/**
 * Check if demo mode is enabled
 * 
 * Demo mode is enabled when:
 * 1. DEMO_MODE=true is explicitly set, OR
 * 2. No GEMINI_API_KEY is present (defaults to demo mode)
 * 
 * @returns true if demo mode is enabled
 */
export function isDemoMode(): boolean {
  // Explicit DEMO_MODE flag (accepts 'true' or '1')
  const demoModeEnv = process.env.DEMO_MODE;
  if (demoModeEnv === 'true' || demoModeEnv === '1') {
    return true;
  }
  
  // Default to demo mode if no API key is present (hackathon-friendly)
  if (!process.env.GEMINI_API_KEY) {
    return true;
  }
  
  return false;
}

/**
 * Check if demo mode should use mock Gemini responses
 * In demo mode, all Gemini calls are mocked
 */
export function shouldMockGeminiInDemoMode(): boolean {
  return isDemoMode();
}

/**
 * Get demo mode status for UI display
 */
export function getDemoModeStatus(): {
  enabled: boolean;
  reason: 'explicit' | 'no-api-key' | 'disabled';
} {
  const demoModeEnv = process.env.DEMO_MODE;
  if (demoModeEnv === 'true' || demoModeEnv === '1') {
    return { enabled: true, reason: 'explicit' };
  }
  
  if (!process.env.GEMINI_API_KEY) {
    return { enabled: true, reason: 'no-api-key' };
  }
  
  return { enabled: false, reason: 'disabled' };
}


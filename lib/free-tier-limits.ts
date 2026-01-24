/**
 * Free Tier Limits Module
 * Central limiter for enforcing free-tier constraints server-side
 * 
 * All limits must be enforced server-side - client checks are not sufficient.
 */

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  retryAfter?: number;
  suggestedAction?: string;
}

export interface TokenEstimate {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

/**
 * Free Tier Configuration
 */
export const FREE_TIER_LIMITS = {
  // File limits
  MAX_FILES_PER_CASE: 1,
  MAX_UPLOAD_SIZE_BYTES: 1.5 * 1024 * 1024, // 1.5 MB
  MAX_DOCUMENT_CHARS: 30_000,
  
  // MIME types
  ALLOWED_MIME_TYPES: ['text/plain'],
  PDF_ALLOWED: process.env.FREE_PDF_ALLOWED === 'true',
  
  // Gemini call limits
  MAX_GEMINI_CALLS_PER_RUN: 6,
  MAX_TOKENS_PER_RUN: 60_000,
  
  // Rate limits
  MAX_RUNS_PER_IP_PER_DAY: 3,
  MAX_REQUESTS_PER_IP_PER_MINUTE: 10,
  
  // Model selection
  FREE_MODE: process.env.FREE_MODE === 'true',
  FREE_MODEL: 'gemini-3-flash-preview', // Use Gemini 3 Flash
  FREE_THINKING_LEVEL: 'low' as const,
  
  // Global daily limit for real Gemini calls
  MAX_REAL_RUNS_PER_DAY_GLOBAL: 1,
};

// Add PDF to allowed types if env var is set
if (FREE_TIER_LIMITS.PDF_ALLOWED) {
  FREE_TIER_LIMITS.ALLOWED_MIME_TYPES.push('application/pdf');
}

/**
 * Check file upload limits
 */
export function checkFileUploadLimit(
  fileSize: number,
  mimeType: string,
  fileCount: number,
  documentLength?: number
): LimitCheckResult {
  // Check file count
  if (fileCount > FREE_TIER_LIMITS.MAX_FILES_PER_CASE) {
    return {
      allowed: false,
      reason: `Maximum ${FREE_TIER_LIMITS.MAX_FILES_PER_CASE} file per case allowed in free mode`,
      suggestedAction: 'Remove extra files or upgrade to paid mode',
    };
  }
  
  // Check file size
  if (fileSize > FREE_TIER_LIMITS.MAX_UPLOAD_SIZE_BYTES) {
    const maxMB = (FREE_TIER_LIMITS.MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)).toFixed(1);
    return {
      allowed: false,
      reason: `File size (${(fileSize / (1024 * 1024)).toFixed(1)}MB) exceeds free mode limit of ${maxMB}MB`,
      suggestedAction: 'Reduce file size or upgrade to paid mode',
    };
  }
  
  // Check MIME type
  if (!FREE_TIER_LIMITS.ALLOWED_MIME_TYPES.includes(mimeType)) {
    if (mimeType === 'application/pdf' && !FREE_TIER_LIMITS.PDF_ALLOWED) {
      return {
        allowed: false,
        reason: 'PDF files are not allowed in free mode',
        suggestedAction: 'Convert to text/plain or set FREE_PDF_ALLOWED=true',
      };
    }
    return {
      allowed: false,
      reason: `File type "${mimeType}" not allowed in free mode. Allowed types: ${FREE_TIER_LIMITS.ALLOWED_MIME_TYPES.join(', ')}`,
      suggestedAction: 'Use text/plain format or upgrade to paid mode',
    };
  }
  
  // Check document length (if provided)
  if (documentLength !== undefined && documentLength > FREE_TIER_LIMITS.MAX_DOCUMENT_CHARS) {
    return {
      allowed: false,
      reason: `Document length (${documentLength.toLocaleString()} chars) exceeds free mode limit of ${FREE_TIER_LIMITS.MAX_DOCUMENT_CHARS.toLocaleString()} characters`,
      suggestedAction: 'Reduce document size or upgrade to paid mode',
    };
  }
  
  return { allowed: true };
}

/**
 * Estimate tokens for a document
 * Rough estimate: ~4 characters per token for text
 */
export function estimateTokens(documentLength: number, isPDF: boolean = false): TokenEstimate {
  // Conservative estimate: 4 chars per token for text, higher for PDF
  const charsPerToken = isPDF ? 3 : 4;
  const inputTokens = Math.ceil(documentLength / charsPerToken);
  
  // Estimate output tokens based on steps (conservative)
  // Each step typically generates 1-3k tokens of output
  const outputTokensPerStep = 2000;
  const totalOutputTokens = outputTokensPerStep * FREE_TIER_LIMITS.MAX_GEMINI_CALLS_PER_RUN;
  
  return {
    inputTokens,
    outputTokens: totalOutputTokens,
    totalTokens: inputTokens + totalOutputTokens,
  };
}

/**
 * Check token budget for a run
 */
export function checkTokenBudget(estimatedTokens: number): LimitCheckResult {
  if (estimatedTokens > FREE_TIER_LIMITS.MAX_TOKENS_PER_RUN) {
    return {
      allowed: false,
      reason: `Estimated tokens (${estimatedTokens.toLocaleString()}) exceed free mode limit of ${FREE_TIER_LIMITS.MAX_TOKENS_PER_RUN.toLocaleString()}`,
      suggestedAction: 'Use "Run Lite Mode" or reduce document size',
    };
  }
  
  return { allowed: true };
}

/**
 * Get client IP from request
 */
export function getClientIP(headers: Record<string, string | string[] | undefined>): string {
  // Check X-Forwarded-For (Vercel, Render, etc.)
  const forwardedFor = headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips.split(',')[0].trim();
  }
  
  // Check X-Real-IP
  const realIP = headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }
  
  // Fallback
  return '127.0.0.1';
}

/**
 * Rate limit store (in-memory for free tier)
 * In production, use Redis or DB for distributed systems
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
  runsToday: number;
  dayResetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check rate limits
 */
export function checkRateLimit(
  ip: string,
  isRunRequest: boolean = false
): LimitCheckResult {
  const now = Date.now();
  const minute = 60 * 1000;
  const day = 24 * 60 * 60 * 1000;
  
  let entry = rateLimitStore.get(ip);
  
  // Reset if expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + minute,
      runsToday: entry?.runsToday || 0,
      dayResetAt: entry?.dayResetAt || (now + day),
    };
  }
  
  // Reset daily runs if new day
  if (entry.dayResetAt < now) {
    entry.runsToday = 0;
    entry.dayResetAt = now + day;
  }
  
  // Check per-minute limit
  if (entry.count >= FREE_TIER_LIMITS.MAX_REQUESTS_PER_IP_PER_MINUTE) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      reason: `Rate limit exceeded: ${FREE_TIER_LIMITS.MAX_REQUESTS_PER_IP_PER_MINUTE} requests per minute`,
      retryAfter,
      suggestedAction: `Wait ${retryAfter} seconds before retrying`,
    };
  }
  
  // Check daily runs limit (only for run requests)
  if (isRunRequest && entry.runsToday >= FREE_TIER_LIMITS.MAX_RUNS_PER_IP_PER_DAY) {
    const hoursUntilReset = Math.ceil((entry.dayResetAt - now) / (60 * 60 * 1000));
    return {
      allowed: false,
      reason: `Daily run limit exceeded: ${FREE_TIER_LIMITS.MAX_RUNS_PER_IP_PER_DAY} runs per day`,
      retryAfter: Math.ceil((entry.dayResetAt - now) / 1000),
      suggestedAction: `You have reached the daily limit. Try again in ${hoursUntilReset} hour(s)`,
    };
  }
  
  // Increment counters
  entry.count++;
  if (isRunRequest) {
    entry.runsToday++;
  }
  rateLimitStore.set(ip, entry);
  
  return { allowed: true };
}

/**
 * Get remaining runs for IP
 */
export function getRemainingRuns(ip: string): { remaining: number; resetAt: number } {
  const entry = rateLimitStore.get(ip);
  if (!entry) {
    return {
      remaining: FREE_TIER_LIMITS.MAX_RUNS_PER_IP_PER_DAY,
      resetAt: Date.now() + (24 * 60 * 60 * 1000),
    };
  }
  
  const now = Date.now();
  if (entry.dayResetAt < now) {
    return {
      remaining: FREE_TIER_LIMITS.MAX_RUNS_PER_IP_PER_DAY,
      resetAt: now + (24 * 60 * 60 * 1000),
    };
  }
  
  return {
    remaining: Math.max(0, FREE_TIER_LIMITS.MAX_RUNS_PER_IP_PER_DAY - entry.runsToday),
    resetAt: entry.dayResetAt,
  };
}

/**
 * Check if free mode is enabled
 */
export function isFreeMode(): boolean {
  // Read directly from env to allow runtime changes in tests
  return process.env.FREE_MODE === 'true';
}

/**
 * Get free mode model name
 */
export function getFreeModeModel(): string {
  return FREE_TIER_LIMITS.FREE_MODEL;
}

/**
 * Get free mode thinking level
 */
export function getFreeModeThinkingLevel(): 'low' | 'medium' | 'high' {
  return FREE_TIER_LIMITS.FREE_THINKING_LEVEL;
}

/**
 * Validate model selection for free mode
 */
export function validateModelForFreeMode(model: string, thinkingLevel?: string): LimitCheckResult {
  if (!isFreeMode()) {
    return { allowed: true };
  }
  
  // Only allow Flash model in free mode
  if (!model.includes('flash')) {
    return {
      allowed: false,
      reason: 'Only Flash model is available in free mode',
      suggestedAction: 'Free mode uses gemini-3-flash-preview automatically',
    };
  }
  
  // Only allow low thinking level
  if (thinkingLevel && thinkingLevel !== 'low') {
    return {
      allowed: false,
      reason: 'High thinking level is not available in free mode',
      suggestedAction: 'Free mode uses low thinking level automatically',
    };
  }
  
  return { allowed: true };
}

/**
 * Reset rate limits (for admin/testing)
 */
export function resetRateLimits(ip?: string): void {
  if (ip) {
    rateLimitStore.delete(ip);
  } else {
    rateLimitStore.clear();
  }
}


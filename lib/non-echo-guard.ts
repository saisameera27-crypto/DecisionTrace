/**
 * Non-Echo Guard
 * 
 * Detects and prevents direct copy-paste of input text in AI responses.
 * If any field contains >30% direct overlap with raw input text, it should be rewritten.
 */

/**
 * Calculate the percentage of direct overlap between two strings
 * Uses word-level comparison to detect copy-paste
 */
export function calculateTextOverlap(text1: string, text2: string): number {
  if (!text1 || !text2) return 0;

  // Normalize: lowercase, remove extra whitespace
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
  const normalized1 = normalize(text1);
  const normalized2 = normalize(text2);

  // If strings are identical, 100% overlap
  if (normalized1 === normalized2) return 100;

  // Split into words
  const words1 = normalized1.split(/\s+/).filter(w => w.length > 0);
  const words2 = normalized2.split(/\s+/).filter(w => w.length > 0);

  if (words1.length === 0 || words2.length === 0) return 0;

  // Find longest common subsequence of words
  const lcs = longestCommonSubsequence(words1, words2);
  const overlapPercent = (lcs.length / Math.min(words1.length, words2.length)) * 100;

  return overlapPercent;
}

/**
 * Find longest common subsequence of two word arrays
 */
function longestCommonSubsequence(words1: string[], words2: string[]): string[] {
  const m = words1.length;
  const n = words2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (words1[i - 1] === words2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Reconstruct LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (words1[i - 1] === words2[j - 1]) {
      lcs.unshift(words1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

/**
 * Check if a field value has >30% overlap with raw input text
 * Returns true if overlap exceeds threshold (indicating echo/copy-paste)
 */
export function hasExcessiveEcho(fieldValue: string, rawInput: string, threshold: number = 30): boolean {
  if (!fieldValue || !rawInput) return false;
  const overlap = calculateTextOverlap(fieldValue, rawInput);
  return overlap > threshold;
}

/**
 * Validate an entire object for echo violations
 * Returns array of field paths that exceed the threshold
 */
export function validateNonEcho(
  data: Record<string, any>,
  rawInput: string,
  threshold: number = 30,
  path: string = ''
): string[] {
  const violations: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === 'string' && value.length > 0) {
      // Skip citation/quote fields (they should contain verbatim text)
      if (key.includes('quote') || key.includes('citation') || key.includes('excerpt') || key.includes('anchor')) {
        continue;
      }

      if (hasExcessiveEcho(value, rawInput, threshold)) {
        violations.push(currentPath);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object' && item !== null) {
          violations.push(...validateNonEcho(item, rawInput, threshold, `${currentPath}[${index}]`));
        } else if (typeof item === 'string' && item.length > 0) {
          // Skip citation fields
          if (!key.includes('quote') && !key.includes('citation') && !key.includes('excerpt')) {
            if (hasExcessiveEcho(item, rawInput, threshold)) {
              violations.push(`${currentPath}[${index}]`);
            }
          }
        }
      });
    } else if (typeof value === 'object' && value !== null) {
      violations.push(...validateNonEcho(value, rawInput, threshold, currentPath));
    }
  }

  return violations;
}


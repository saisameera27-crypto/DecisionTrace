/**
 * Defensive limits for analyze: file size and text length sent to Gemini.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export const GEMINI_TEXT_HEAD_CHARS = 20_000;
export const GEMINI_TEXT_TAIL_CHARS = 5_000;

const TRUNCATE_MARKER = "\n\n[... middle of document omitted for analysis ...]\n\n";

/**
 * Limits text sent to Gemini: first headChars + last tailChars, with a marker in between.
 * If text is shorter than headChars + tailChars, returns as-is.
 */
export function truncateTextForGemini(
  text: string,
  headChars: number = GEMINI_TEXT_HEAD_CHARS,
  tailChars: number = GEMINI_TEXT_TAIL_CHARS
): string {
  const trimmed = (text ?? "").trim();
  if (trimmed.length <= headChars + tailChars) return trimmed;
  const head = trimmed.slice(0, headChars);
  const tail = trimmed.slice(-tailChars);
  return head + TRUNCATE_MARKER + tail;
}

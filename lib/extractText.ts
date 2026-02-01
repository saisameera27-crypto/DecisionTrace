/**
 * Extract plain text from an uploaded File.
 * Supports: .txt, .md (UTF-8), .docx (mammoth), .pdf (pdf-parse).
 *
 * Dependencies: mammoth, pdf-parse (see package.json).
 *
 * RUNTIME: Node only. Do NOT use Edge runtime. Reject any suggestion to switch to Edge.
 * This module uses Buffer, mammoth, and pdf-parse, which require Node. Use in API routes
 * with: export const runtime = "nodejs";
 */

import mammoth from "mammoth";
import pdfParseLib from "pdf-parse";

const SUPPORTED_EXTENSIONS = [".txt", ".md", ".docx", ".pdf"];
const SUPPORTED_MIMES = [
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
];

function getFileKind(filename: string, mimeType: string): "txt" | "md" | "docx" | "pdf" | null {
  const lower = filename.toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  if (mime.includes("wordprocessingml") || lower.endsWith(".docx")) return "docx";
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (mime.includes("markdown") || lower.endsWith(".md")) return "md";
  if (mime.startsWith("text/") || lower.endsWith(".txt")) return "txt";

  return null;
}

export type ExtractTextMeta = {
  filename: string;
  mimeType: string;
  size: number;
};

export type ExtractTextResult = {
  text: string;
  meta: ExtractTextMeta;
};

/**
 * Extract text from an uploaded File.
 * - .txt / .md: read as UTF-8
 * - .docx: mammoth
 * - .pdf: pdf-parse
 * - Other: throws with supported types listed.
 */
export async function extractTextFromUpload(file: File): Promise<ExtractTextResult> {
  const filename = file.name || "unknown";
  const mimeType = file.type || "";
  const size = file.size ?? 0;

  const meta: ExtractTextMeta = { filename, mimeType, size };
  const kind = getFileKind(filename, mimeType);

  if (kind === null) {
    throw new Error(
      `Unsupported file type. Supported: ${SUPPORTED_EXTENSIONS.join(", ")} (MIME: ${SUPPORTED_MIMES.join(", ")}). Got: ${filename} (${mimeType || "unknown"}).`
    );
  }

  try {
    let text: string;

    if (kind === "txt" || kind === "md") {
      text = await file.text();
      text = (text || "").trim();
    } else {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (kind === "docx") {
        const result = await mammoth.extractRawText({ buffer });
        text = (result.value || "").trim();
      } else if (kind === "pdf") {
        const pdfData = await (pdfParseLib as (buf: Buffer) => Promise<{ text?: string }>)(buffer);
        text = (pdfData.text || "").trim();
      } else {
        text = "";
      }
    }

    return { text, meta };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Unsupported file type")) throw err;
    if (kind === "docx") {
      throw new Error(`DOCX extraction failed: ${message}`);
    }
    if (kind === "pdf") {
      throw new Error(`PDF extraction failed: ${message}`);
    }
    throw new Error(`Failed to extract text from ${filename}: ${message}`);
  }
}

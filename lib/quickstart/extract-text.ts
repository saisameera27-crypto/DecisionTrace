/**
 * Text Extraction Library for QuickStart Upload
 * 
 * Extracts readable text from uploaded files (TXT, MD, DOCX, PDF)
 * This is separated from the route handler to enable fast unit testing
 */

import mammoth from 'mammoth';
import pdfParseLib from 'pdf-parse';

export type FileKind = 'txt' | 'md' | 'docx' | 'pdf' | 'unknown';

/**
 * Detect file kind from filename and optional MIME type
 */
export function detectFileKind(filename: string, mimeType?: string): FileKind {
  // Check DOCX
  if (
    mimeType?.includes('officedocument.wordprocessingml.document') ||
    filename.toLowerCase().endsWith('.docx')
  ) {
    return 'docx';
  }

  // Check PDF
  if (mimeType === 'application/pdf' || filename.toLowerCase().endsWith('.pdf')) {
    return 'pdf';
  }

  // Check Markdown
  if (mimeType === 'text/markdown' || filename.toLowerCase().endsWith('.md')) {
    return 'md';
  }

  // Check Text
  if (mimeType === 'text/plain' || filename.toLowerCase().endsWith('.txt')) {
    return 'txt';
  }

  // Default to txt for text/* MIME types
  if (mimeType?.startsWith('text/')) {
    return 'txt';
  }

  return 'unknown';
}

/**
 * Extract text from uploaded file bytes
 * 
 * @param args - File metadata and bytes
 * @returns Extracted text and optional warnings
 */
export async function extractTextFromUpload(args: {
  filename: string;
  mimeType?: string;
  bytes: Uint8Array;
}): Promise<{ text: string; warnings?: string[] }> {
  const { filename, mimeType, bytes } = args;
  const fileKind = detectFileKind(filename, mimeType);
  const buffer = Buffer.from(bytes);
  const warnings: string[] = [];

  switch (fileKind) {
    case 'txt':
    case 'md': {
      // Text files: decode UTF-8
      try {
        const text = buffer.toString('utf-8').trim();
        return { text, warnings: warnings.length > 0 ? warnings : undefined };
      } catch (error: any) {
        throw new Error(`Failed to decode text file: ${error?.message || 'Unknown error'}`);
      }
    }

    case 'docx': {
      // DOCX files: use mammoth
      try {
        const result = await mammoth.extractRawText({ buffer });
        const text = (result.value || '').trim();
        if (result.messages && result.messages.length > 0) {
          warnings.push(...result.messages.map(m => m.message || String(m)));
        }
        return { text, warnings: warnings.length > 0 ? warnings : undefined };
      } catch (error: any) {
        throw new Error(`Failed to extract text from DOCX: ${error?.message || 'Unknown error'}`);
      }
    }

    case 'pdf': {
      // PDF files: use pdf-parse
      try {
        const pdfData = await (pdfParseLib as any)(buffer);
        const text = (pdfData.text || '').trim();
        return { text, warnings: warnings.length > 0 ? warnings : undefined };
      } catch (error: any) {
        throw new Error(`Failed to extract text from PDF: ${error?.message || 'Unknown error'}`);
      }
    }

    case 'unknown':
    default: {
      // Unknown file type: try UTF-8 decoding as fallback
      try {
        const text = buffer.toString('utf-8').trim();
        if (text.length === 0 || /[\x00-\x08\x0E-\x1F]/.test(text)) {
          // Contains non-printable characters, likely binary
          throw new Error(`Unsupported file type: ${filename} (${mimeType || 'unknown MIME type'})`);
        }
        return { text, warnings: ['File type unknown, attempted UTF-8 decoding'] };
      } catch (error: any) {
        if (error.message.includes('Unsupported file type')) {
          throw error;
        }
        throw new Error(`Failed to extract text: ${error?.message || 'Unknown error'}`);
      }
    }
  }
}


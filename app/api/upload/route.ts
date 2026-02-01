import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Upload API Route (App Router)
 * Accepts multipart/form-data, parses file only (no external storage).
 */
export async function POST(req: Request | NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: 'Missing or invalid file field' },
        { status: 400 }
      );
    }

    // Parse only: read bytes (no storage)
    const bytes = await file.arrayBuffer();
    const size = bytes.byteLength;

    return NextResponse.json({
      ok: true,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      size,
    }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}

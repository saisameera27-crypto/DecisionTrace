import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

export async function GET() {
  return NextResponse.json({ status: "ok" });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field 'file'" }, { status: 400 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "File too large", maxSizeMB: 5 },
        { status: 413 }
      );
    }

    // Read file into memory (no fs write)
    const buf = await file.arrayBuffer();

    return NextResponse.json({
      ok: true,
      filename: file.name,
      size: buf.byteLength,
      mimeType: file.type || "unknown",
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Upload handler failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";

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

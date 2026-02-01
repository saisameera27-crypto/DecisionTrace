import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const buf = await file.arrayBuffer();

    // TODO: parse text based on file.type (pdf/docx/txt)
    // For now: just return metadata so the pipeline works end-to-end.
    return NextResponse.json({
      ok: true,
      filename: file.name,
      size: buf.byteLength,
      mimeType: file.type || "unknown",
      // trace: { ... }  // later
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Analyze failed", detail: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

// Local-dev image storage under public/uploads. For production, swap this
// for a Supabase Storage upload and keep the same response shape ({ url }).
const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Chỉ hỗ trợ ảnh PNG/JPEG/WEBP/GIF." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Ảnh tối đa 5MB." }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  return NextResponse.json({ url: `/uploads/${filename}` });
}

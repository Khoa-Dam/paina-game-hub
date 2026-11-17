import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guards";

export const runtime = "nodejs";

const ALLOWED_TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/gif", "gif"],
]);
// Leave room for multipart overhead under Vercel Functions' 4.5 MB body limit.
const MAX_SIZE = 4 * 1024 * 1024;

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function uploadToVercelBlob(file: File, extension: string) {
  const objectPath = `uploads/${randomUUID()}.${extension}`;
  try {
    const blob = await put(objectPath, file, {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("Vercel Blob upload failed", error);
    return jsonError("Không thể lưu ảnh vào Vercel Blob. Vui lòng thử lại.", 502);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { admin, response } = await requireAdmin();
    if (!admin) return response;

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || !(file instanceof File)) {
      return jsonError("Vui lòng chọn ảnh để tải lên.", 400);
    }

    const extension = ALLOWED_TYPES.get(file.type);
    if (!extension) {
      return jsonError("Chỉ hỗ trợ ảnh PNG, JPEG, WEBP hoặc GIF.", 400);
    }
    if (file.size === 0) {
      return jsonError("File ảnh đang trống.", 400);
    }
    if (file.size > MAX_SIZE) {
      return jsonError("Ảnh tối đa 4 MB.", 400);
    }

    if (process.env.VERCEL) {
      return await uploadToVercelBlob(file, extension);
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), buffer);

    return NextResponse.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("Admin image upload failed", error);
    return jsonError("Tải ảnh lên thất bại. Vui lòng thử lại.", 500);
  }
}

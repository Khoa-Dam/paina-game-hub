import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setAdminSession } from "@/lib/session";
import { adminLoginSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = adminLoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thông tin đăng nhập không hợp lệ." }, { status: 400 });
  }

  const { username, password } = parsed.data;
  const admin = await prisma.adminAccount.findUnique({ where: { username } });
  if (!admin) {
    return NextResponse.json({ error: "Sai tài khoản hoặc mật khẩu." }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Sai tài khoản hoặc mật khẩu." }, { status: 401 });
  }

  await prisma.adminAccount.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  await setAdminSession(admin.id, admin.username);
  return NextResponse.json({ ok: true });
}

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setEmployeeSession } from "@/lib/session";
import { passwordSetupSchema } from "@/lib/validators";
import { employeePasswordError } from "@/lib/passwordPolicy";
import { withApiErrorHandling } from "@/lib/apiErrorResponse";

export const POST = withApiErrorHandling(async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const parsed = passwordSetupSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Thông tin mật khẩu không hợp lệ." },
      { status: 400 },
    );
  const { password, passwordConfirmation } = parsed.data;
  const passwordError = employeePasswordError(password);
  if (passwordError)
    return NextResponse.json({ error: passwordError }, { status: 400 });
  if (password !== passwordConfirmation)
    return NextResponse.json(
      { error: "Mật khẩu xác nhận không khớp." },
      { status: 400 },
    );

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const setup = await prisma.employeePasswordSetup.findUnique({
    where: { tokenHash },
    include: { employee: { select: { id: true, status: true } } },
  });
  if (
    !setup ||
    setup.usedAt ||
    setup.expiresAt <= new Date() ||
    setup.employee.status !== "ACTIVE"
  ) {
    return NextResponse.json(
      {
        error:
          "Link đặt mật khẩu không hợp lệ hoặc đã hết hạn. Hãy liên hệ Admin để được cấp link mới.",
      },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    await prisma.$transaction(async (tx) => {
      const consumed = await tx.employeePasswordSetup.updateMany({
        where: { id: setup.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) throw new Error("SETUP_TOKEN_ALREADY_USED");
      await tx.employee.update({
        where: { id: setup.employee.id },
        data: { passwordHash },
      });
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "SETUP_TOKEN_ALREADY_USED"
    ) {
      return NextResponse.json(
        {
          error:
            "Link đặt mật khẩu đã được sử dụng. Hãy đăng nhập hoặc liên hệ Admin.",
        },
        { status: 409 },
      );
    }
    throw error;
  }

  await setEmployeeSession(setup.employee.id);
  return NextResponse.json({ ok: true });
});

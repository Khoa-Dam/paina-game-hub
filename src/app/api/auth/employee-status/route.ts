import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { employeeCodeSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const parsed = employeeCodeSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success)
    return NextResponse.json(
      { error: "Nhập mã nhân viên hợp lệ." },
      { status: 400 },
    );

  const employee = await prisma.employee.findUnique({
    where: { employeeCode: parsed.data.employeeCode },
    select: { passwordHash: true },
  });
  return NextResponse.json({
    status: !employee
      ? "NEW"
      : employee.passwordHash
        ? "LOGIN"
        : "PASSWORD_REQUIRED",
  });
}

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { setEmployeeSession } from "@/lib/session";
import { employeeLoginSchema } from "@/lib/validators";

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = employeeLoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Thông tin đăng nhập không hợp lệ." }, { status: 400 });
  }

  const { employeeCode, fullName } = parsed.data;
  let employee = await prisma.employee.findUnique({ where: { employeeCode } });

  if (!employee) {
    // First time this employeeCode is used — self-register it with the
    // given name. Later logins with the same code must match this name,
    // which is what stops someone else from "claiming" an existing code.
    try {
      employee = await prisma.employee.create({
        data: { employeeCode, fullName, status: "ACTIVE" },
      });
    } catch (e) {
      // Lost a race with a concurrent first-time login using the same code.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        employee = await prisma.employee.findUnique({ where: { employeeCode } });
      } else {
        throw e;
      }
    }
  }

  const nameMatches =
    employee && employee.fullName.trim().toLowerCase() === fullName.trim().toLowerCase();

  if (!employee || !nameMatches) {
    return NextResponse.json(
      { error: "Mã nhân viên này đã được đăng ký với họ tên khác. Vui lòng liên hệ Admin nếu có nhầm lẫn." },
      { status: 409 }
    );
  }
  if (employee.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Tài khoản của bạn hiện không hoạt động. Vui lòng liên hệ Admin." },
      { status: 403 }
    );
  }

  await setEmployeeSession(employee.id);
  return NextResponse.json({
    employee: { id: employee.id, fullName: employee.fullName, department: employee.department },
  });
}

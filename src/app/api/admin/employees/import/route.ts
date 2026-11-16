import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guards";
import { parseCsv } from "@/lib/csv";
import { logAdminAction } from "@/lib/auditLog";

// Expects a CSV with header: employeeCode,fullName,email,department,status
export async function POST(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (!admin) return response;

  const body = await req.text();
  const rows = parseCsv(body);
  if (rows.length < 2) {
    return NextResponse.json({ error: "File CSV trống hoặc thiếu dữ liệu." }, { status: 400 });
  }

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = {
    code: header.indexOf("employeecode"),
    name: header.indexOf("fullname"),
    email: header.indexOf("email"),
    dept: header.indexOf("department"),
    status: header.indexOf("status"),
  };
  if (idx.code === -1 || idx.name === -1) {
    return NextResponse.json(
      { error: "CSV cần ít nhất 2 cột: employeeCode, fullName." },
      { status: 400 }
    );
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows.slice(1)) {
    const employeeCode = row[idx.code]?.trim();
    const fullName = row[idx.name]?.trim();
    if (!employeeCode || !fullName) {
      skipped++;
      continue;
    }
    const email = idx.email >= 0 ? row[idx.email]?.trim() || null : null;
    const department = idx.dept >= 0 ? row[idx.dept]?.trim() || null : null;
    const rawStatus = idx.status >= 0 ? row[idx.status]?.trim().toUpperCase() : "ACTIVE";
    const status = rawStatus === "INACTIVE" ? "INACTIVE" : "ACTIVE";

    const existing = await prisma.employee.findUnique({ where: { employeeCode } });
    if (existing) {
      await prisma.employee.update({
        where: { employeeCode },
        data: { fullName, email, department, status },
      });
      updated++;
    } else {
      await prisma.employee.create({
        data: { employeeCode, fullName, email, department, status },
      });
      created++;
    }
  }

  await logAdminAction({
    actor: admin.username,
    action: "IMPORT_EMPLOYEES",
    targetType: "Employee",
    detail: { created, updated, skipped },
  });

  return NextResponse.json({ created, updated, skipped });
}

import { NextResponse } from "next/server";
import { getCurrentEmployee } from "@/lib/session";

export async function GET() {
  const employee = await getCurrentEmployee();
  if (!employee) return NextResponse.json({ employee: null });
  return NextResponse.json({
    employee: {
      id: employee.id,
      fullName: employee.fullName,
      department: employee.department,
      employeeCode: employee.employeeCode,
    },
  });
}

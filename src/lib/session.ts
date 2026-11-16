import { cookies } from "next/headers";
import { sign, verify } from "./token";
import { prisma } from "./prisma";
import { departmentName } from "./employeeDepartment";

const EMPLOYEE_COOKIE = "paina_session";
const ADMIN_COOKIE = "paina_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 12; // 12h

type EmployeePayload = { role: "USER"; employeeId: string };
type AdminPayload = { role: "ADMIN"; adminId: string; username: string };

export async function setEmployeeSession(employeeId: string) {
  const token = sign<EmployeePayload>({ role: "USER", employeeId }, SESSION_MAX_AGE);
  (await cookies()).set(EMPLOYEE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearEmployeeSession() {
  (await cookies()).delete(EMPLOYEE_COOKIE);
}

export async function setAdminSession(adminId: string, username: string) {
  const token = sign<AdminPayload>({ role: "ADMIN", adminId, username }, SESSION_MAX_AGE);
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function getCurrentEmployee() {
  const token = (await cookies()).get(EMPLOYEE_COOKIE)?.value;
  const payload = verify<EmployeePayload>(token);
  if (!payload) return null;
  const employee = await prisma.employee.findUnique({
    where: { id: payload.employeeId },
    include: { departmentInfo: { select: { name: true } } },
  });
  if (!employee || employee.status !== "ACTIVE") return null;
  return { ...employee, department: departmentName(employee) };
}

export async function getCurrentAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verify<AdminPayload>(token);
}

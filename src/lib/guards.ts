import { NextResponse } from "next/server";
import { getCurrentAdmin, getCurrentEmployee } from "./session";

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { admin: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { admin, response: null };
}

export async function requireEmployee() {
  const employee = await getCurrentEmployee();
  if (!employee) {
    return { employee: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { employee, response: null };
}

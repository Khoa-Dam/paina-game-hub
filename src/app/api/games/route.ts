import { NextResponse } from "next/server";
import { getEmployeeGameList } from "@/lib/employeeGameList";
import { getEmployeeIdFromSessionToken } from "@/lib/session";
import { withApiErrorHandling } from "@/lib/apiErrorResponse";

export const GET = withApiErrorHandling(async function GET() {
  const employeeId = await getEmployeeIdFromSessionToken();
  if (!employeeId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const games = await getEmployeeGameList(employeeId);
  if (!games) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ games });
});

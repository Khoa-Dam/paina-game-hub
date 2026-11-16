import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiErrorHandling } from "@/lib/apiErrorResponse";

export const GET = withApiErrorHandling(async function GET() {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, code: true, name: true },
  });

  return NextResponse.json({ departments });
});

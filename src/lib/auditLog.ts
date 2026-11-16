import { prisma } from "./prisma";

export async function logAdminAction(params: {
  actor: string;
  action: string;
  targetType: string;
  targetId?: string;
  detail?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actor: params.actor,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      detail: params.detail ? JSON.stringify(params.detail) : null,
    },
  });
}

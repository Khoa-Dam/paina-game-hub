import { NextResponse } from "next/server";

const TRANSIENT_PRISMA_CODES = new Set([
  "P1001",
  "P1002",
  "P1008",
  "P1017",
  "P2024",
  "P2037",
]);

const TRANSIENT_SOCKET_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const value = error as { code?: unknown; cause?: unknown };
  if (typeof value.code === "string") return value.code;
  return getErrorCode(value.cause);
}

export function isTransientDatabaseError(error: unknown): boolean {
  const code = getErrorCode(error);
  if (
    code &&
    (TRANSIENT_PRISMA_CODES.has(code) || TRANSIENT_SOCKET_CODES.has(code))
  ) {
    return true;
  }

  if (error instanceof Error && error.cause) {
    return isTransientDatabaseError(error.cause);
  }
  return false;
}

export function toApiErrorResponse(error: unknown): NextResponse {
  const code = getErrorCode(error);
  const name = error instanceof Error ? error.name : "UnknownError";

  if (isTransientDatabaseError(error)) {
    console.error("Temporary database availability error", { name, code });
    return NextResponse.json(
      {
        error: "Hệ thống đang bận, vui lòng thử lại sau ít phút.",
        code: "TEMPORARILY_UNAVAILABLE",
      },
      { status: 503, headers: { "Retry-After": "3" } },
    );
  }

  console.error("Unhandled API error", { name, code });
  return NextResponse.json(
    { error: "Đã xảy ra lỗi. Vui lòng thử lại sau." },
    { status: 500 },
  );
}

type ApiHandler<TArgs extends unknown[]> = (
  ...args: TArgs
) => Promise<NextResponse>;

export function withApiErrorHandling<TArgs extends unknown[]>(
  handler: ApiHandler<TArgs>,
): ApiHandler<TArgs> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args);
    } catch (error) {
      return toApiErrorResponse(error);
    }
  };
}

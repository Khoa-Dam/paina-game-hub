import type { ApiErrorResponse } from "../types";

export function isRecoverableApiError(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      "recoverable" in error &&
      error.recoverable === true)
  );
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T &
    ApiErrorResponse & { code?: string };
  if (!response.ok) {
    if (response.status === 503 || data.code === "TEMPORARILY_UNAVAILABLE") {
      const error = new Error(
        "Hệ thống đang bận. Vui lòng thử lại sau ít phút.",
      );
      Object.assign(error, { recoverable: true });
      throw error;
    }
    throw new Error(data.error || "Không thể kết nối. Vui lòng thử lại.");
  }
  return data;
}

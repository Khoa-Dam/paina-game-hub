import type { ApiErrorResponse } from "../types";

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T &
    ApiErrorResponse;
  if (!response.ok) {
    throw new Error(data.error || "Không thể kết nối. Vui lòng thử lại.");
  }
  return data;
}

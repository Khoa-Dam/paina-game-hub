export async function readAdminResponse<T>(
  response: Response,
  fallbackError: string,
): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: unknown })
    | null;
  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : fallbackError,
    );
  }
  if (!data) throw new Error(fallbackError);
  return data;
}

export function getAdminErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

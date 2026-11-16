export const EMPLOYEE_PASSWORD_MIN_BYTES = 10;
export const EMPLOYEE_PASSWORD_MAX_BYTES = 72;

export function employeePasswordError(password: string): string | null {
  const bytes = Buffer.byteLength(password, "utf8");
  if (bytes < EMPLOYEE_PASSWORD_MIN_BYTES)
    return "Mật khẩu cần có ít nhất 10 byte.";
  if (bytes > EMPLOYEE_PASSWORD_MAX_BYTES)
    return "Mật khẩu không được vượt quá 72 byte.";
  return null;
}

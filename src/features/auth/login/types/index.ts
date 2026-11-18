export type DepartmentOption = {
  id: string;
  code: string | null;
  name: string;
};

export type AccountState =
  | "NEW"
  | "LOGIN"
  | "PASSWORD_REQUIRED"
  | "PENDING"
  | "INACTIVE";

export type LoginFormValues = {
  fullName: string;
  departmentId: string;
  password: string;
  passwordConfirmation: string;
};

export type EmployeeStatusResponse = { status: AccountState };
export type DepartmentsResponse = { departments: DepartmentOption[] };
export type ApiErrorResponse = { error?: string };

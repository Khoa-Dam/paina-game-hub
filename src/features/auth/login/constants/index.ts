export const LOGIN_ENDPOINTS = {
  departments: "/api/departments",
  status: "/api/auth/employee-status",
  register: "/api/auth/register",
  login: "/api/auth/employee-login",
} as const;

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 72;

export const INITIAL_FORM = {
  fullName: "",
  departmentId: "",
  password: "",
  passwordConfirmation: "",
};

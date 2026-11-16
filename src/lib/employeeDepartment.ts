type DepartmentRecord = { name: string } | null;

export function departmentName(employee: {
  departmentInfo?: DepartmentRecord;
  legacyDepartment?: string | null;
}): string | null {
  return employee.departmentInfo?.name ?? employee.legacyDepartment ?? null;
}

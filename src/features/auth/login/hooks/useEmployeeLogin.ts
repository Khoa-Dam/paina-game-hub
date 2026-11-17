"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { INITIAL_FORM, LOGIN_ENDPOINTS } from "../constants";
import type {
  AccountState,
  DepartmentsResponse,
  DepartmentOption,
  EmployeeStatusResponse,
  LoginFormValues,
} from "../types";
import { isRecoverableApiError, parseApiResponse } from "../utils/api";

export function useEmployeeLogin() {
  const router = useRouter();
  const [employeeCode, setEmployeeCode] = useState("");
  const [accountState, setAccountState] = useState<AccountState | null>(null);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [departmentLoadError, setDepartmentLoadError] = useState(false);
  const [statusCheckError, setStatusCheckError] = useState(false);
  const [form, setForm] = useState<LoginFormValues>(INITIAL_FORM);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(LOGIN_ENDPOINTS.departments)
      .then((response) => parseApiResponse<DepartmentsResponse>(response))
      .then(({ departments: items }) => {
        if (!cancelled) setDepartments(items);
      })
      .catch(() => {
        if (!cancelled) {
          setDepartments([]);
          setDepartmentLoadError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function retryDepartments() {
    setDepartmentLoadError(false);
    try {
      const response = await fetch(LOGIN_ENDPOINTS.departments);
      const result = await parseApiResponse<DepartmentsResponse>(response);
      setDepartments(result.departments);
    } catch {
      setDepartmentLoadError(true);
    }
  }

  async function checkEmployeeCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await lookupEmployee();
  }

  async function lookupEmployee() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(LOGIN_ENDPOINTS.status, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeCode }),
      });
      const result = await parseApiResponse<EmployeeStatusResponse>(response);
      setAccountState(result.status);
      setForm(INITIAL_FORM);
      setStatusCheckError(false);
    } catch (requestError) {
      setStatusCheckError(isRecoverableApiError(requestError));
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể kết nối. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const registering = accountState === "NEW";
    try {
      const response = await fetch(
        registering ? LOGIN_ENDPOINTS.register : LOGIN_ENDPOINTS.login,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            registering
              ? { employeeCode, ...form }
              : { employeeCode, password: form.password },
          ),
        },
      );
      await parseApiResponse(response);
      router.push("/home");
      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Không thể kết nối. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof LoginFormValues>(
    field: K,
    value: LoginFormValues[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function changeEmployeeCode(value: string) {
    setEmployeeCode(value);
    setAccountState(null);
    setStatusCheckError(false);
    setError(null);
  }

  function resetAccountState() {
    setAccountState(null);
    setError(null);
    setForm(INITIAL_FORM);
  }

  return {
    accountState,
    changeEmployeeCode,
    checkEmployeeCode,
    departments,
    departmentLoadError,
    employeeCode,
    error,
    form,
    loading,
    retryDepartments,
    resetAccountState,
    retryStatusCheck: lookupEmployee,
    submitCredentials,
    statusCheckError,
    updateForm,
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminToast } from "@/components/admin/AdminToastProvider";
import {
  getAdminErrorMessage,
  readAdminResponse,
} from "@/lib/adminApi";

type Department = {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
};

type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  departmentId: string | null;
  departmentInfo: Department | null;
  legacyDepartment: string | null;
  hasPassword: boolean;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
};

const EMPTY_FORM = {
  employeeCode: "",
  fullName: "",
  email: "",
  departmentId: "",
};

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  if (!body) {
    throw new Error(`API trả về nội dung rỗng (HTTP ${response.status}).`);
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(
      `API trả về dữ liệu không phải JSON (HTTP ${response.status}).`,
    );
  }
}

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    employeeCode: "",
    fullName: "",
    email: "",
    departmentId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [setupUrl, setSetupUrl] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [passwordTargetId, setPasswordTargetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useAdminToast();

  async function load() {
    setError(null);
    try {
      const [employeeRes, departmentRes] = await Promise.all([
        fetch("/api/admin/employees"),
        fetch("/api/admin/departments"),
      ]);
      const [employeeData, departmentData] = await Promise.all([
        readJsonResponse<{ employees?: Employee[]; error?: string }>(
          employeeRes,
        ),
        readJsonResponse<{ departments?: Department[]; error?: string }>(
          departmentRes,
        ),
      ]);

      if (!employeeRes.ok || !departmentRes.ok) {
        throw new Error(
          employeeData.error ||
            departmentData.error ||
            "Không thể tải nhân sự hoặc danh sách phòng ban.",
        );
      }

      setEmployees(employeeData.employees || []);
      setDepartments(departmentData.departments || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải nhân sự hoặc danh sách phòng ban.",
      );
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, status: "ACTIVE" }),
      });
      await readAdminResponse(response, "Không thể tạo nhân sự.");
      setForm(EMPTY_FORM);
      await load();
      showToast("Đã thêm nhân sự.");
    } catch (error) {
      showToast(getAdminErrorMessage(error, "Không thể tạo nhân sự."), "error");
    }
  }

  function startEdit(employee: Employee) {
    if (employee.status === "PENDING") return;
    setEditingId(employee.id);
    setEditForm({
      employeeCode: employee.employeeCode,
      fullName: employee.fullName,
      email: employee.email || "",
      departmentId: employee.departmentId || "",
    });
    setError(null);
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode: editForm.employeeCode,
          fullName: editForm.fullName,
          email: editForm.email,
          departmentId: editForm.departmentId || null,
        }),
      });
      await readAdminResponse(res, "Không thể cập nhật nhân sự.");
      setEditingId(null);
      await load();
      showToast("Đã cập nhật thông tin nhân sự.");
    } catch (error) {
      showToast(getAdminErrorMessage(error, "Không thể cập nhật nhân sự."), "error");
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleStatus(employee: Employee) {
    if (employee.status === "PENDING") return;
    const nextStatus = employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const response = await fetch(`/api/admin/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await readAdminResponse(response, "Không thể đổi trạng thái tài khoản.");
      await load();
      showToast(nextStatus === "ACTIVE" ? "Đã mở khóa tài khoản." : "Đã tạm khóa tài khoản.");
    } catch (error) {
      showToast(
        getAdminErrorMessage(error, "Không thể đổi trạng thái tài khoản."),
        "error",
      );
    }
  }

  async function approveRegistration(employee: Employee) {
    try {
      const response = await fetch(
        `/api/admin/employees/${employee.id}/approve`,
        { method: "POST" },
      );
      await readAdminResponse(response, "Không thể duyệt tài khoản.");
      await load();
      showToast(`Đã duyệt tài khoản ${employee.employeeCode}.`);
    } catch (error) {
      showToast(getAdminErrorMessage(error, "Không thể duyệt tài khoản."), "error");
    }
  }

  async function setEmployeePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordTargetId) return;
    if (newPassword !== passwordConfirmation) {
      showToast("Mật khẩu xác nhận không khớp.", "error");
      return;
    }

    setSavingPassword(true);
    try {
      const response = await fetch(
        `/api/admin/employees/${passwordTargetId}/password`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: newPassword }),
        },
      );
      await readAdminResponse(response, "Không thể đặt mật khẩu mới.");
      const employee = employees?.find((item) => item.id === passwordTargetId);
      setPasswordTargetId(null);
      setNewPassword("");
      setPasswordConfirmation("");
      await load();
      showToast(`Đã đặt mật khẩu mới cho ${employee?.employeeCode ?? "nhân sự"}.`);
    } catch (error) {
      showToast(getAdminErrorMessage(error, "Không thể đặt mật khẩu mới."), "error");
    } finally {
      setSavingPassword(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Xóa nhân sự này?")) return;
    const employee = employees?.find((item) => item.id === id);
    try {
      const response = await fetch(`/api/admin/employees/${id}`, {
        method: "DELETE",
      });
      await readAdminResponse(response, "Không thể xóa nhân sự.");
      await load();
      showToast(`Đã xóa nhân sự ${employee?.employeeCode ?? ""}.`.trim());
    } catch (error) {
      showToast(getAdminErrorMessage(error, "Không thể xóa nhân sự."), "error");
    }
  }

  async function issuePasswordSetup(employee: Employee) {
    setSetupUrl(null);
    try {
      const response = await fetch(
        `/api/admin/employees/${employee.id}/password-setup`,
        { method: "POST" },
      );
      const data = await readAdminResponse<{ url: string }>(
        response,
        "Không thể tạo link đặt mật khẩu.",
      );
      setSetupUrl(data.url);
      showToast("Đã tạo link đặt mật khẩu.");
    } catch (error) {
      showToast(
        getAdminErrorMessage(error, "Không thể tạo link đặt mật khẩu."),
        "error",
      );
    }
  }

  async function importCsv(file: File) {
    setImportMessage(null);
    try {
      const text = await file.text();
      const response = await fetch("/api/admin/employees/import", {
        method: "POST",
        headers: { "Content-Type": "text/csv" },
        body: text,
      });
      const data = await readAdminResponse<{
        created: number;
        updated: number;
        skipped: number;
        invalidDepartments?: string[];
      }>(response, "Import thất bại.");
      const invalid = data.invalidDepartments?.length
        ? ` Phòng ban không khớp danh mục: ${data.invalidDepartments.join(", ")}.`
        : "";
      setImportMessage(
        `Đã thêm ${data.created}, cập nhật ${data.updated}, bỏ qua ${data.skipped}.${invalid}`,
      );
      await load();
      showToast("Đã import danh sách nhân sự.");
    } catch (error) {
      const message = getAdminErrorMessage(error, "Import thất bại.");
      setImportMessage(message);
      showToast(message, "error");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  async function copySetupUrl() {
    if (!setupUrl) return;
    try {
      await navigator.clipboard.writeText(setupUrl);
      showToast("Đã sao chép link đặt mật khẩu.");
    } catch {
      showToast("Không thể sao chép link. Hãy chọn và sao chép thủ công.", "error");
    }
  }

  function departmentLabel(employee: Employee) {
    return (
      employee.departmentInfo?.name ||
      employee.legacyDepartment ||
      "Chưa phân loại"
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-ink">
        Quản lý nhân sự
      </h1>

      <div className="card space-y-3">
        <h2 className="font-heading text-lg font-bold text-ink">Import CSV</h2>
        <p className="text-sm text-muted">
          Cột: employeeCode, fullName, email, department, status
          (ACTIVE/INACTIVE). Phòng ban nhập theo mã hoặc tên trong danh mục.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
        />
        {importMessage && <p className="text-sm text-ink">{importMessage}</p>}
      </div>

      <form
        onSubmit={createEmployee}
        className="card grid grid-cols-1 gap-3 sm:grid-cols-5"
      >
        <input
          className="input"
          placeholder="Mã NV"
          value={form.employeeCode}
          onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Họ tên"
          value={form.fullName}
          onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <select
          className="input"
          value={form.departmentId}
          onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
          required
        >
          <option value="">Chọn phòng ban</option>
          {departments
            .filter((department) => department.isActive)
            .map((department) => (
              <option key={department.id} value={department.id}>
                {department.code ? `${department.code} · ` : ""}
                {department.name}
              </option>
            ))}
        </select>
        <button type="submit" className="btn-primary">
          + Thêm
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {setupUrl && (
        <div className="card space-y-2 border-amber-300 bg-amber-50">
          <p className="font-semibold text-ink">
            Link đặt mật khẩu dùng một lần (hết hạn sau 24 giờ)
          </p>
          <p className="break-all text-sm">{setupUrl}</p>
          <p className="text-xs text-muted">
            Gửi link riêng cho đúng nhân viên. Không chia sẻ công khai.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => void copySetupUrl()}
          >
            Sao chép link
          </button>
        </div>
      )}

      {!employees && <p className="text-muted">Đang tải...</p>}
      {employees?.some((employee) => employee.status === "PENDING") && (
        <p
          className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
          role="status"
        >
          Có {employees.filter((employee) => employee.status === "PENDING").length} tài khoản đang chờ duyệt. Các yêu cầu này được hiển thị đầu danh sách.
        </p>
      )}
      {employees && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3">Mã NV</th>
                <th className="px-4 py-3">Họ tên</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phòng ban</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {[...employees]
                .sort(
                  (first, second) =>
                    Number(second.status === "PENDING") -
                    Number(first.status === "PENDING"),
                )
                .map((employee) =>
                editingId === employee.id ? (
                  <tr
                    key={employee.id}
                    className="border-b border-border/60 align-top"
                  >
                    <td className="px-2 py-2">
                      <input
                        className="input min-w-24"
                        value={editForm.employeeCode}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            employeeCode: e.target.value,
                          })
                        }
                        aria-label="Mã nhân viên"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="input min-w-36"
                        value={editForm.fullName}
                        onChange={(e) =>
                          setEditForm({ ...editForm, fullName: e.target.value })
                        }
                        aria-label="Họ tên"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="input min-w-36"
                        type="email"
                        value={editForm.email}
                        onChange={(e) =>
                          setEditForm({ ...editForm, email: e.target.value })
                        }
                        aria-label="Email"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        className="input min-w-48"
                        value={editForm.departmentId}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            departmentId: e.target.value,
                          })
                        }
                        aria-label="Phòng ban"
                      >
                        <option value="">Chưa phân loại</option>
                        {departments.map((department) => (
                          <option
                            key={department.id}
                            value={department.id}
                            disabled={
                              !department.isActive &&
                              employee.departmentId !== department.id
                            }
                          >
                            {department.code ? `${department.code} · ` : ""}
                            {department.name}
                            {department.isActive ? "" : " (đã ngừng)"}
                          </option>
                        ))}
                      </select>
                      {employee.legacyDepartment &&
                        !employee.departmentInfo && (
                          <p className="mt-1 text-xs text-amber-700">
                            Tên cũ: {employee.legacyDepartment}
                          </p>
                        )}
                    </td>
                    <td className="px-4 py-3">
                      {employee.status === "ACTIVE"
                        ? "Hoạt động"
                        : employee.status === "PENDING"
                          ? "Chờ duyệt"
                          : "Ngừng hoạt động"}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex gap-2 whitespace-nowrap">
                        <button
                          onClick={() => void saveEdit(employee.id)}
                          disabled={savingEdit}
                          className="text-xs font-semibold text-ink hover:underline disabled:opacity-50"
                        >
                          Lưu
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-muted hover:underline"
                        >
                          Hủy
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr
                    key={employee.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-ink">
                      {employee.employeeCode}
                    </td>
                    <td className="px-4 py-3">{employee.fullName}</td>
                    <td className="px-4 py-3 text-muted">
                      {employee.email || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {departmentLabel(employee)}
                      {employee.legacyDepartment &&
                        !employee.departmentInfo && (
                          <span className="ml-1 text-xs text-amber-700">
                            (cần gán lại)
                          </span>
                        )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${employee.status === "ACTIVE" ? "bg-lime-200 text-lime-800" : employee.status === "PENDING" ? "bg-amber-200 text-amber-900" : "bg-gray-200 text-gray-600"}`}
                      >
                        {employee.status === "ACTIVE"
                          ? "Hoạt động"
                          : employee.status === "PENDING"
                            ? "Chờ duyệt"
                            : "Ngừng hoạt động"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3 whitespace-nowrap">
                        {employee.status === "PENDING" && (
                          <button
                            onClick={() => void approveRegistration(employee)}
                            className="text-xs font-semibold text-lime-700 hover:underline"
                          >
                            Duyệt tài khoản
                          </button>
                        )}
                        {employee.status !== "PENDING" && (
                          <button
                            onClick={() => startEdit(employee)}
                            className="text-xs text-ink hover:underline"
                          >
                            Sửa
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setPasswordTargetId(employee.id);
                            setNewPassword("");
                            setPasswordConfirmation("");
                          }}
                          disabled={employee.status !== "ACTIVE"}
                          className="text-xs text-ink hover:underline disabled:opacity-40"
                        >
                          Đặt mật khẩu mới
                        </button>
                        <button
                          onClick={() => void issuePasswordSetup(employee)}
                          disabled={employee.status !== "ACTIVE"}
                          className="text-xs text-ink hover:underline disabled:opacity-40"
                        >
                          {employee.hasPassword
                            ? "Reset mật khẩu"
                            : "Cấp link đặt mật khẩu"}
                        </button>
                        {employee.status !== "PENDING" && (
                          <button
                            onClick={() => void toggleStatus(employee)}
                            className="text-xs text-ink hover:underline"
                          >
                            {employee.status === "ACTIVE" ? "Tạm khóa" : "Mở lại"}
                          </button>
                        )}
                        <button
                          onClick={() => void remove(employee.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Xóa
                        </button>
                      </div>
                      {passwordTargetId === employee.id && (
                        <form
                          onSubmit={setEmployeePassword}
                          className="mt-3 grid min-w-64 gap-2 rounded-xl border border-border p-3"
                        >
                          <label
                            className="text-xs font-medium"
                            htmlFor={`new-password-${employee.id}`}
                          >
                            Mật khẩu mới (ít nhất 10 ký tự)
                          </label>
                          <input
                            id={`new-password-${employee.id}`}
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            minLength={10}
                            maxLength={72}
                            value={newPassword}
                            onChange={(event) =>
                              setNewPassword(event.target.value)
                            }
                            required
                          />
                          <label
                            className="text-xs font-medium"
                            htmlFor={`confirm-password-${employee.id}`}
                          >
                            Nhập lại mật khẩu mới
                          </label>
                          <input
                            id={`confirm-password-${employee.id}`}
                            className="input"
                            type="password"
                            autoComplete="new-password"
                            minLength={10}
                            maxLength={72}
                            value={passwordConfirmation}
                            onChange={(event) =>
                              setPasswordConfirmation(event.target.value)
                            }
                            required
                          />
                          <div className="flex gap-3">
                            <button
                              type="submit"
                              disabled={savingPassword}
                              className="text-xs font-semibold text-ink hover:underline disabled:opacity-50"
                            >
                              {savingPassword ? "Đang lưu..." : "Lưu mật khẩu"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setPasswordTargetId(null)}
                              className="text-xs text-muted hover:underline"
                            >
                              Hủy
                            </button>
                          </div>
                        </form>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

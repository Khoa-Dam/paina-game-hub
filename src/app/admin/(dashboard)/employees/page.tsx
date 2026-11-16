"use client";

import { useEffect, useRef, useState } from "react";

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
  status: "ACTIVE" | "INACTIVE";
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
  const fileRef = useRef<HTMLInputElement>(null);

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
    setError(null);
    const res = await fetch("/api/admin/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status: "ACTIVE" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(
        typeof data.error === "string" ? data.error : "Không thể tạo nhân sự.",
      );
      return;
    }
    setForm(EMPTY_FORM);
    await load();
  }

  function startEdit(employee: Employee) {
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
    setError(null);
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
      const data = await res.json();
      if (!res.ok) {
        setError(
          typeof data.error === "string"
            ? data.error
            : "Không thể cập nhật nhân sự.",
        );
        return;
      }
      setEditingId(null);
      await load();
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleStatus(employee: Employee) {
    await fetch(`/api/admin/employees/${employee.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    });
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Xóa nhân sự này?")) return;
    await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
    await load();
  }

  async function issuePasswordSetup(employee: Employee) {
    setError(null);
    setSetupUrl(null);
    const res = await fetch(
      `/api/admin/employees/${employee.id}/password-setup`,
      { method: "POST" },
    );
    const data = await res.json();
    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : "Không thể tạo link đặt mật khẩu.",
      );
      return;
    }
    setSetupUrl(data.url);
  }

  async function importCsv(file: File) {
    setImportMessage(null);
    const text = await file.text();
    const res = await fetch("/api/admin/employees/import", {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: text,
    });
    const data = await res.json();
    if (res.ok) {
      const invalid = data.invalidDepartments?.length
        ? ` Phòng ban không khớp danh mục: ${data.invalidDepartments.join(", ")}.`
        : "";
      setImportMessage(
        `Đã thêm ${data.created}, cập nhật ${data.updated}, bỏ qua ${data.skipped}.${invalid}`,
      );
      await load();
    } else {
      setImportMessage(data.error || "Import thất bại.");
    }
    if (fileRef.current) fileRef.current.value = "";
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
            onClick={() => navigator.clipboard?.writeText(setupUrl)}
          >
            Sao chép link
          </button>
        </div>
      )}

      {!employees && <p className="text-muted">Đang tải...</p>}
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
              {employees.map((employee) =>
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
                        className={`badge ${employee.status === "ACTIVE" ? "bg-lime-200 text-lime-800" : "bg-gray-200 text-gray-600"}`}
                      >
                        {employee.status === "ACTIVE"
                          ? "Hoạt động"
                          : "Ngừng hoạt động"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3 whitespace-nowrap">
                        <button
                          onClick={() => startEdit(employee)}
                          className="text-xs text-ink hover:underline"
                        >
                          Sửa
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
                        <button
                          onClick={() => void toggleStatus(employee)}
                          className="text-xs text-ink hover:underline"
                        >
                          {employee.status === "ACTIVE" ? "Tạm khóa" : "Mở lại"}
                        </button>
                        <button
                          onClick={() => void remove(employee.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Xóa
                        </button>
                      </div>
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

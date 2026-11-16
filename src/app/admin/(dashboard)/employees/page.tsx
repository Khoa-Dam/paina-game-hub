"use client";

import { useEffect, useRef, useState } from "react";

type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string | null;
  department: string | null;
  status: "ACTIVE" | "INACTIVE";
};

export default function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[] | null>(null);
  const [form, setForm] = useState({ employeeCode: "", fullName: "", email: "", department: "" });
  const [error, setError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/admin/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees || []));
  }
  useEffect(load, []);

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
      setError(typeof data.error === "string" ? data.error : "Không thể tạo nhân sự.");
      return;
    }
    setForm({ employeeCode: "", fullName: "", email: "", department: "" });
    load();
  }

  async function toggleStatus(emp: Employee) {
    await fetch(`/api/admin/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: emp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Xóa nhân sự này?")) return;
    await fetch(`/api/admin/employees/${id}`, { method: "DELETE" });
    load();
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
      setImportMessage(`Đã thêm ${data.created}, cập nhật ${data.updated}, bỏ qua ${data.skipped}.`);
      load();
    } else {
      setImportMessage(data.error || "Import thất bại.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold text-ink">Quản lý nhân sự</h1>

      <div className="card space-y-3">
        <h2 className="font-heading text-lg font-bold text-ink">Import CSV</h2>
        <p className="text-sm text-muted">
          Cột: employeeCode, fullName, email, department, status (ACTIVE/INACTIVE).
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])}
        />
        {importMessage && <p className="text-sm text-ink">{importMessage}</p>}
      </div>

      <form onSubmit={createEmployee} className="card grid grid-cols-1 gap-3 sm:grid-cols-5">
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
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="input"
          placeholder="Phòng ban"
          value={form.department}
          onChange={(e) => setForm({ ...form, department: e.target.value })}
        />
        <button type="submit" className="btn-primary">
          + Thêm
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!employees && <p className="text-muted">Đang tải...</p>}
      {employees && (
        <table className="w-full card text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted">
              <th className="py-2 pr-4">Mã NV</th>
              <th className="py-2 pr-4">Họ tên</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Phòng ban</th>
              <th className="py-2 pr-4">Trạng thái</th>
              <th className="py-2 pr-4">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => (
              <tr key={emp.id} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-4 font-medium text-ink">{emp.employeeCode}</td>
                <td className="py-2 pr-4">{emp.fullName}</td>
                <td className="py-2 pr-4 text-muted">{emp.email || "-"}</td>
                <td className="py-2 pr-4">{emp.department || "-"}</td>
                <td className="py-2 pr-4">
                  <span className={`badge ${emp.status === "ACTIVE" ? "bg-lime-200 text-lime-800" : "bg-gray-200 text-gray-600"}`}>
                    {emp.status === "ACTIVE" ? "Hoạt động" : "Ngừng hoạt động"}
                  </span>
                </td>
                <td className="py-2 pr-4">
                  <div className="flex gap-2">
                    <button onClick={() => toggleStatus(emp)} className="text-xs text-ink hover:underline">
                      {emp.status === "ACTIVE" ? "Tạm khóa" : "Mở lại"}
                    </button>
                    <button onClick={() => remove(emp.id)} className="text-xs text-red-500 hover:text-red-700">
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

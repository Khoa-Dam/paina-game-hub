"use client";

import { useEffect, useState } from "react";

type Department = {
  id: string;
  code: string | null;
  name: string;
  isActive: boolean;
  sortOrder: number;
  _count: { employees: number };
};

export default function AdminDepartmentsPage() {
  const [departments, setDepartments] = useState<Department[] | null>(null);
  const [form, setForm] = useState({ code: "", name: "", sortOrder: "0" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ code: "", name: "", sortOrder: "0" });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/departments");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Không thể tải danh sách phòng ban.");
      return;
    }
    setDepartments(data.departments || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createDepartment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    const res = await fetch("/api/admin/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        name: form.name,
        sortOrder: Number(form.sortOrder),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Không thể thêm phòng ban.");
      return;
    }
    setForm({ code: "", name: "", sortOrder: "0" });
    setMessage("Đã thêm phòng ban.");
    await load();
  }

  function startEdit(department: Department) {
    setEditingId(department.id);
    setEditForm({
      code: department.code || "",
      name: department.name,
      sortOrder: String(department.sortOrder),
    });
    setError(null);
    setMessage(null);
  }

  async function saveEdit(id: string) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: editForm.code,
        name: editForm.name,
        sortOrder: Number(editForm.sortOrder),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Không thể cập nhật phòng ban.");
      return;
    }
    setEditingId(null);
    setMessage("Đã cập nhật phòng ban.");
    await load();
  }

  async function toggleActive(department: Department) {
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/departments/${department.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !department.isActive }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Không thể đổi trạng thái phòng ban.");
      return;
    }
    setMessage(department.isActive ? "Đã ngừng hoạt động phòng ban." : "Đã kích hoạt phòng ban.");
    await load();
  }

  async function remove(department: Department) {
    if (department._count.employees > 0) return;
    if (!confirm(`Xóa phòng ban “${department.name}”?`)) return;
    setError(null);
    setMessage(null);
    const res = await fetch(`/api/admin/departments/${department.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Không thể xóa phòng ban.");
      return;
    }
    setMessage("Đã xóa phòng ban.");
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-ink">Quản lý phòng ban</h1>
        <p className="mt-1 text-sm text-muted">Phòng ban đang được nhân viên sử dụng cần được chuyển nhân viên trước khi xóa.</p>
      </div>

      <form onSubmit={createDepartment} className="card grid grid-cols-1 gap-3 sm:grid-cols-[9rem_1fr_8rem_auto]">
        <input
          className="input"
          placeholder="Mã (01)"
          aria-label="Mã phòng ban"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
        />
        <input
          className="input"
          placeholder="Tên phòng ban"
          aria-label="Tên phòng ban"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <input
          className="input"
          type="number"
          min="0"
          placeholder="Thứ tự"
          aria-label="Thứ tự hiển thị"
          value={form.sortOrder}
          onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
        />
        <button type="submit" className="btn-primary">+ Thêm phòng ban</button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-ink">{message}</p>}
      {!departments && <p className="text-muted">Đang tải...</p>}

      {departments && (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Tên phòng ban</th>
                <th className="px-4 py-3">Thứ tự</th>
                <th className="px-4 py-3">Nhân viên</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => editingId === department.id ? (
                <tr key={department.id} className="border-b border-border/60">
                  <td className="px-4 py-3"><input className="input min-w-20" value={editForm.code} onChange={(e) => setEditForm({ ...editForm, code: e.target.value })} aria-label="Mã phòng ban" /></td>
                  <td className="px-4 py-3"><input className="input min-w-64" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} aria-label="Tên phòng ban" /></td>
                  <td className="px-4 py-3"><input className="input w-20" type="number" min="0" value={editForm.sortOrder} onChange={(e) => setEditForm({ ...editForm, sortOrder: e.target.value })} aria-label="Thứ tự hiển thị" /></td>
                  <td className="px-4 py-3">{department._count.employees}</td>
                  <td className="px-4 py-3">{department.isActive ? "Đang hoạt động" : "Đã ngừng"}</td>
                  <td className="px-4 py-3"><div className="flex gap-3"><button onClick={() => void saveEdit(department.id)} className="text-xs font-semibold text-ink hover:underline">Lưu</button><button onClick={() => setEditingId(null)} className="text-xs text-muted hover:underline">Hủy</button></div></td>
                </tr>
              ) : (
                <tr key={department.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3">{department.code || "-"}</td>
                  <td className="px-4 py-3 font-medium text-ink">{department.name}</td>
                  <td className="px-4 py-3">{department.sortOrder}</td>
                  <td className="px-4 py-3">{department._count.employees}</td>
                  <td className="px-4 py-3">{department.isActive ? "Đang hoạt động" : "Đã ngừng"}</td>
                  <td className="px-4 py-3"><div className="flex gap-3 whitespace-nowrap">
                    <button onClick={() => startEdit(department)} className="text-xs text-ink hover:underline">Sửa</button>
                    <button onClick={() => void toggleActive(department)} className="text-xs text-ink hover:underline">{department.isActive ? "Ngừng" : "Kích hoạt"}</button>
                    <button onClick={() => void remove(department)} disabled={department._count.employees > 0} title={department._count.employees > 0 ? "Chuyển nhân viên trước khi xóa" : undefined} className="text-xs text-red-500 hover:underline disabled:cursor-not-allowed disabled:opacity-40">Xóa</button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

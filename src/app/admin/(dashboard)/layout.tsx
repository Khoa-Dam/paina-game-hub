import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/session";
import AdminSidebar from "@/components/AdminSidebar";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="flex min-h-screen bg-paper">
      <AdminSidebar username={admin.username} />
      <main className="flex-1 px-4 py-6 sm:px-8">{children}</main>
    </div>
  );
}

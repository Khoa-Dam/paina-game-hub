import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/session";
import Navbar from "@/components/Navbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const employee = await getCurrentEmployee();
  if (!employee) redirect("/login");

  return (
    <div className="min-h-screen bg-paper">
      <Navbar fullName={employee.fullName} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

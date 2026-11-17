import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/session";
import { isTransientDatabaseError } from "@/lib/apiErrorResponse";
import Navbar from "@/components/Navbar";
import TemporaryUnavailablePage from "@/components/TemporaryUnavailablePage";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let employee: Awaited<ReturnType<typeof getCurrentEmployee>>;
  try {
    employee = await getCurrentEmployee();
  } catch (error) {
    if (isTransientDatabaseError(error)) return <TemporaryUnavailablePage />;
    throw error;
  }
  if (!employee) redirect("/login");

  return (
    <div className="min-h-screen bg-paper">
      <Navbar fullName={employee.fullName} />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

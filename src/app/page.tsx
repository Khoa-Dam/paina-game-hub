import { redirect } from "next/navigation";
import { getCurrentEmployee } from "@/lib/session";

export default async function RootPage() {
  const employee = await getCurrentEmployee();
  redirect(employee ? "/home" : "/login");
}

import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { canViewFinancials } from "@/lib/roles";
import PaymentsAdmin from "@/components/admin/PaymentsAdmin";

export default async function AdminPaymentsPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canViewFinancials(admin.role)) redirect("/admin/dashboard");

  return <PaymentsAdmin />;
}

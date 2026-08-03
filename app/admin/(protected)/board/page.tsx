import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { canManageBoard } from "@/lib/roles";
import BoardAdmin from "@/components/admin/BoardAdmin";

export default async function AdminBoardPage() {
  const admin = await getCurrentAdmin();
  if (!admin || !canManageBoard(admin.role)) redirect("/admin/dashboard");

  return <BoardAdmin currentAdminId={admin.id} currentAdminRole={admin.role} />;
}

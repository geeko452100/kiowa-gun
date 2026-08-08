import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { canManageBoard } from "@/lib/roles";
import LogoutButton from "@/components/LogoutButton";
import "../admin.css";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/pages", label: "Page Text" },
  { href: "/admin/calendar", label: "Calendar" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/members", label: "Members" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/email", label: "Send Email" },
  { href: "/admin/sms", label: "Send Text" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const links = canManageBoard(admin.role)
    ? [...LINKS, { href: "/admin/board", label: "Board Members" }]
    : LINKS;

  return (
    <div className="admin-shell">
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <h2>Kiowa Gun Club</h2>
          <nav>
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <LogoutButton />
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}

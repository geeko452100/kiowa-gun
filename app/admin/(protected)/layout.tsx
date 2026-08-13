import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { canManageBoard } from "@/lib/roles";
import LogoutButton from "@/components/LogoutButton";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "../admin.css";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/calendar", label: "Calendar" },
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
    <>
      <Header active="dashboard" />
      <div className="admin-shell">
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <h2>Board Menu</h2>
            <nav>
              <Link href="/" className="admin-edit-site-link">
                Edit Site Layout
              </Link>
              {links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
            <LogoutButton />
          </aside>
          <main className="admin-main" id="main">
            {children}
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}

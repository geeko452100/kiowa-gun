import { getCurrentMember } from "@/lib/memberAuth";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "../../styles/portal.css";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect("/portal/login");

  return (
    <>
      <Header active="portal" />
      <main className="container" id="main">
        {children}
      </main>
      <Footer />
    </>
  );
}

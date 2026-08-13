import { getCurrentMember } from "@/lib/memberAuth";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const member = await getCurrentMember();
  if (!member) redirect("/portal/login");
  // A plain `member.emailVerified ? children : ...` doesn't actually stop
  // Next.js from rendering/including the page segment -- only a real
  // redirect() short-circuits before that happens. See app/portal/verify-pending.
  if (!member.emailVerified) redirect("/portal/verify-pending");
  // Suspended for a lapsed NRA membership (see app/api/cron/nra-check) --
  // blocked from the rest of the portal (including dues payment) until an
  // admin reviews their re-submitted proof and restores access.
  if (member.status === "Member" && !member.nraActive) redirect("/portal/nra-expired");

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

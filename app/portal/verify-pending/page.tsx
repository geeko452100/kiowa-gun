import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/memberAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VerifyEmailBanner from "@/components/portal/VerifyEmailBanner";
import PortalLogoutButton from "@/components/portal/PortalLogoutButton";

export const metadata = { title: "Verify Your Email - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

// Deliberately a sibling of app/portal/(protected), not inside it: the
// (protected) layout redirect()s here for any unverified member, and a
// layout can't reliably keep its own children out of the render (a plain
// `condition ? children : ...` doesn't stop Next.js from still rendering and
// including the page segment) -- an actual redirect is what avoids that.
export default async function VerifyPendingPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/portal/login");
  if (member.emailVerified) redirect("/portal");

  return (
    <>
      <Header active="portal" />
      <main className="container" id="main">
        <Suspense fallback={null}>
          <VerifyEmailBanner />
        </Suspense>
        <PortalLogoutButton />
      </main>
      <Footer />
    </>
  );
}

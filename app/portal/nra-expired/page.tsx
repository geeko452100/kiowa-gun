import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/memberAuth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NraUpdateForm from "@/components/portal/NraUpdateForm";

export const metadata = { title: "NRA Membership Expired - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function NraExpiredPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/portal/login");
  // Only suspended members land here -- anyone else (including a member who
  // was just restored) belongs back on the normal dashboard.
  if (!(member.status === "Member" && !member.nraActive)) redirect("/portal");

  return (
    <>
      <Header active="portal" />
      <main className="container" id="main">
        <div className="portal-dashboard">
          <p className="portal-banner">
            Your NRA membership has expired. Please update your details to restore club access.
          </p>
          <section className="portal-panel">
            <h1>Update Your NRA Membership</h1>
            <NraUpdateForm initialNraNumber={member.nraNumber ?? ""} initialNraExpirationDate={member.nraExpirationDate ?? ""} />
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}

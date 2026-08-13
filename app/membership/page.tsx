import { inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EditableSection from "@/components/EditableSection";
import AdditionalSections from "@/components/AdditionalSections";
import EditModeBanner from "@/components/EditModeBanner";
import "../styles/rules-body.css";
import "../styles/membership.css";

export const metadata = { title: "Membership Info - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const db = await getDb();
  const [sections, admin] = await Promise.all([
    db
      .select()
      .from(pageSections)
      .where(inArray(pageSections.pageSlug, ["membership", "agreement"])),
    getCurrentAdmin(),
  ]);
  const terms = sections.find((s) => s.pageSlug === "membership" && s.sectionKey === "terms");
  const membershipSections = sections.filter((s) => s.pageSlug === "membership");

  return (
    <>
      <Header active="membership" />
      <main className="container" id="main">
        {admin && <EditModeBanner name={admin.name} />}
        <section id="membership" className="content-section">
          <div className="membership-layout">
            {terms && (
              <EditableSection
                id={terms.id}
                heading={terms.heading}
                bodyHtml={terms.bodyHtml}
                isAdmin={!!admin}
                headingTag="h1"
              />
            )}
          </div>
        </section>
        <section id="membership-apply" className="content-section">
          <h2>Apply for Membership</h2>
          <p>
            Ready to join? Click below to fill out your information, read and sign the Range
            Rules, upload the required documents, and pay your dues. Once you&apos;re a member,
            your annual dues renew automatically.
          </p>
          <p>
            <a href="/membership/apply" target="_blank" rel="noopener noreferrer" className="register-button">
              Register for Membership
            </a>
          </p>
        </section>

        <AdditionalSections pageSlug="membership" sections={membershipSections} isAdmin={!!admin} />
      </main>
      <Footer />
    </>
  );
}

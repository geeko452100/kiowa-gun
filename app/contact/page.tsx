import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EditableSection from "@/components/EditableSection";
import AdditionalSections from "@/components/AdditionalSections";
import EditModeBanner from "@/components/EditModeBanner";

export const metadata = { title: "Contact Us - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const db = await getDb();
  const [sections, admin] = await Promise.all([
    db.select().from(pageSections).where(eq(pageSections.pageSlug, "contact")),
    getCurrentAdmin(),
  ]);
  const details = sections.find((s) => s.sectionKey === "details");

  return (
    <>
      <Header active="contact" />
      <main className="container" id="main">
        {admin && <EditModeBanner name={admin.name} />}
        <section id="contact" className="content-section">
          <h1>Get in Touch</h1>
          {details && (
            <EditableSection
              id={details.id}
              heading={details.heading}
              bodyHtml={details.bodyHtml}
              isAdmin={!!admin}
            />
          )}
        </section>

        <AdditionalSections pageSlug="contact" sections={sections} isAdmin={!!admin} />
      </main>
      <Footer />
    </>
  );
}

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections, documents } from "@/lib/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MembershipForm from "@/components/MembershipForm";
import "../styles/membership.css";

export const metadata = { title: "Membership Info - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const db = await getDb();
  const sections = await db
    .select()
    .from(pageSections)
    .where(eq(pageSections.pageSlug, "membership"));
  const terms = sections.find((s) => s.sectionKey === "terms");
  const docs = await db.select().from(documents).where(eq(documents.category, "membership"));

  return (
    <>
      <Header active="membership" />
      <main className="container" id="main">
        <section id="membership" className="content-section">
          <h2>{terms?.heading}</h2>
          <div className="membership-layout">
            {docs.map((doc) => (
              <div key={doc.id}>
                <p className="pdf-download-caption">
                  Click below to download {doc.title.toLowerCase()}
                </p>
                <div className="pdf-download">
                  <a className="pdf-thumb" href={`/api/documents/${doc.id}`} download>
                    <img
                      src="/assets/rules-img.avif"
                      alt={`Preview of ${doc.title}`}
                      className="pdf-thumb-icon"
                    />
                    <span className="pdf-thumb-label">Download {doc.title} (PDF)</span>
                  </a>
                </div>
              </div>
            ))}
            <div dangerouslySetInnerHTML={{ __html: terms?.bodyHtml ?? "" }} />
          </div>
        </section>
        <section id="membership-apply" className="content-section">
          <h2>Apply / Renew</h2>
          <p>
            Ready to join or renew? Fill out the form below to submit your information, upload the
            required documents, and pay your dues.
          </p>
          <MembershipForm />
        </section>
      </main>
      <Footer />
    </>
  );
}

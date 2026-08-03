import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "../styles/rules-body.css";
import "../styles/rules.css";

export const metadata = { title: "Range Rules - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const db = await getDb();
  const sections = await db.select().from(pageSections).where(eq(pageSections.pageSlug, "rules"));
  const intro = sections.find((s) => s.sectionKey === "intro");
  const body = sections.find((s) => s.sectionKey === "body");

  return (
    <>
      <Header active="rules" />
      <main className="container" id="main">
        <section id="rules" className="content-section safety-rules">
          <h2>{intro?.heading}</h2>
          <div dangerouslySetInnerHTML={{ __html: intro?.bodyHtml ?? "" }} />
          <div className="rules-body">
            <img
              src="/assets/guns-welcome.avif"
              alt="Firearms laid out at the Kiowa Gun Club range"
              className="rules-image"
            />
            <div
              className="rules-text"
              dangerouslySetInnerHTML={{ __html: body?.bodyHtml ?? "" }}
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { resolveSiteImages } from "@/lib/siteImages";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EditableSection from "@/components/EditableSection";
import EditableImage from "@/components/EditableImage";
import AdditionalSections from "@/components/AdditionalSections";
import EditModeBanner from "@/components/EditModeBanner";
import "../styles/rules-body.css";
import "../styles/rules.css";

export const metadata = { title: "Range Rules - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const db = await getDb();
  const [sections, admin, images] = await Promise.all([
    db.select().from(pageSections).where(eq(pageSections.pageSlug, "rules")),
    getCurrentAdmin(),
    resolveSiteImages(["rules-photo"]),
  ]);
  const intro = sections.find((s) => s.sectionKey === "intro");
  const body = sections.find((s) => s.sectionKey === "body");

  return (
    <>
      <Header active="rules" />
      <main className="container" id="main">
        {admin && <EditModeBanner name={admin.name} />}
        <section id="rules" className="content-section safety-rules">
          {intro && (
            <EditableSection
              id={intro.id}
              heading={intro.heading}
              bodyHtml={intro.bodyHtml}
              isAdmin={!!admin}
              headingTag="h1"
            />
          )}
          <div className="rules-body">
            <EditableImage
              imageKey="rules-photo"
              src={images["rules-photo"] ?? "/assets/guns-welcome.avif"}
              hasOverride={!!images["rules-photo"]}
              alt="Firearms laid out at the Kiowa Gun Club range"
              className="rules-image"
              wrapClassName="rules-image-wrap"
              isAdmin={!!admin}
            />
            {body && (
              <EditableSection
                id={body.id}
                bodyHtml={body.bodyHtml}
                isAdmin={!!admin}
                className="rules-text"
              />
            )}
          </div>
        </section>

        <AdditionalSections pageSlug="rules" sections={sections} isAdmin={!!admin} />
      </main>
      <Footer />
    </>
  );
}

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import EditableSection from "@/components/EditableSection";
import AdditionalSections from "@/components/AdditionalSections";
import EditModeBanner from "@/components/EditModeBanner";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await getDb();
  const [sections, admin] = await Promise.all([
    db.select().from(pageSections).where(eq(pageSections.pageSlug, "home")),
    getCurrentAdmin(),
  ]);
  const welcome = sections.find((s) => s.sectionKey === "welcome");
  const matchesTeaser = sections.find((s) => s.sectionKey === "matches_teaser");

  return (
    <>
      <Header active="home" />
      <main className="container" id="main">
        {admin && <EditModeBanner name={admin.name} />}
        <section id="welcome" className="content-section">
          {welcome && (
            <EditableSection
              id={welcome.id}
              heading={welcome.heading}
              bodyHtml={welcome.bodyHtml}
              isAdmin={!!admin}
              headingTag="h1"
            />
          )}
        </section>

        <p className="register-cta">
          <a href="/membership/apply" target="_blank" rel="noopener noreferrer" className="register-button">
            Register for Membership
          </a>
        </p>

        <section id="rules" className="content-section rules-summary">
          <h2>Jeff Cooper&apos;s Rules of Gun Safety</h2>
          <ol>
            <li>RULE I: ALL GUNS ARE ALWAYS LOADED</li>
            <li>RULE II: NEVER LET THE MUZZLE COVER ANYTHING YOU ARE NOT WILLING TO DESTROY</li>
            <li>RULE III: KEEP YOUR FINGER OFF THE TRIGGER UNTIL YOUR SIGHTS ARE ON THE TARGET</li>
            <li>RULE IV: BE SURE OF YOUR TARGET</li>
          </ol>
          <p>
            <a href="/rules">View full range rules &rarr;</a>
          </p>
        </section>

        <section id="matches" className="content-section">
          {matchesTeaser && (
            <EditableSection
              id={matchesTeaser.id}
              heading={matchesTeaser.heading}
              bodyHtml={matchesTeaser.bodyHtml}
              isAdmin={!!admin}
            />
          )}
          <p>
            <a href="/matches">View full match schedule &rarr;</a>
          </p>
        </section>

        <AdditionalSections pageSlug="home" sections={sections} isAdmin={!!admin} />
      </main>
      <Footer />
    </>
  );
}

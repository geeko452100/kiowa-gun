import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./styles/news.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const db = await getDb();
  const sections = await db.select().from(pageSections).where(eq(pageSections.pageSlug, "home"));
  const welcome = sections.find((s) => s.sectionKey === "welcome");
  const matchesTeaser = sections.find((s) => s.sectionKey === "matches_teaser");
  const notice = sections.find((s) => s.sectionKey === "notice");

  return (
    <>
      <Header active="home" />
      <main className="container" id="main">
        <section id="welcome" className="content-section">
          <h2>{welcome?.heading}</h2>
          <div dangerouslySetInnerHTML={{ __html: welcome?.bodyHtml ?? "" }} />
        </section>

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
          <h2>{matchesTeaser?.heading}</h2>
          <div dangerouslySetInnerHTML={{ __html: matchesTeaser?.bodyHtml ?? "" }} />
          <p>
            <a href="/matches">View full match schedule &rarr;</a>
          </p>
        </section>

        <div id="notice" className="content-section notice">
          <h2>{notice?.heading}</h2>
          <div dangerouslySetInnerHTML={{ __html: notice?.bodyHtml ?? "" }} />
          <p>
            <a href="/news">View full notice &rarr;</a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

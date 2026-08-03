import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "../styles/about.css";

const LOCATION_QUERY = "369 SW 50 Ave, Great Bend, KS 67530";

export const metadata = { title: "About Us / Map - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const db = await getDb();
  const sections = await db.select().from(pageSections).where(eq(pageSections.pageSlug, "about"));
  const officers = sections.find((s) => s.sectionKey === "officers");
  const encodedQuery = encodeURIComponent(LOCATION_QUERY);

  return (
    <>
      <Header active="about" />
      <main className="container" id="main">
        <section id="about" className="content-section">
          <h2>About Us / Map</h2>
          <div dangerouslySetInnerHTML={{ __html: officers?.bodyHtml ?? "" }} />
          <p>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`}
              target="_blank"
              rel="noopener"
            >
              Get directions
            </a>
          </p>
          <div id="range-map" className="map-embed">
            <iframe
              src={`https://www.google.com/maps?q=${encodedQuery}&output=embed`}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Map to Kiowa Gun Club"
            />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

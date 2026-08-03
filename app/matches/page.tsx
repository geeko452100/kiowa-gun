import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections, matches } from "@/lib/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FlyerModal from "@/components/FlyerModal";
import "../styles/rules-body.css";
import "../styles/matches.css";

export const metadata = { title: "Matches - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function MatchesPage() {
  const db = await getDb();
  const sections = await db
    .select()
    .from(pageSections)
    .where(eq(pageSections.pageSlug, "matches"));
  const intro = sections.find((s) => s.sectionKey === "intro");
  const schedule = await db.select().from(matches).orderBy(asc(matches.sortOrder));

  return (
    <>
      <Header active="matches" />
      <main className="container" id="main">
        <section id="matches" className="content-section">
          <h2>{intro?.heading}</h2>
          <div dangerouslySetInnerHTML={{ __html: intro?.bodyHtml ?? "" }} />

          <div className="match-schedule-wrap">
            <table className="match-schedule">
              <caption className="sr-only">Defensive pistol match schedule</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Time</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.id}>
                    <td>{row.eventDate}</td>
                    <td>{row.eventTime}</td>
                    <td>{row.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="results-body">
            <FlyerModal src="/assets/pistol-flyer.avif" alt="Defensive pistol match flyer" />
            <div>
              <h3>Defensive Pistol Match Results</h3>
              <ul className="match-results">
                {schedule.map((row) =>
                  row.resultsUrl ? (
                    <li key={row.id}>
                      <a href={row.resultsUrl} target="_blank" rel="noopener">
                        {row.eventDate}
                      </a>
                    </li>
                  ) : (
                    <li key={row.id}>
                      {row.eventDate} <span className="results-pending">(results not yet posted)</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          <div className="match-gallery">
            <img src="/assets/range-image-1.avif" alt="Kiowa Gun Club range" />
            <img src="/assets/range-image-2.avif" alt="Shooters at the Kiowa Gun Club range" />
            <img src="/assets/range-image-3.avif" alt="Kiowa Gun Club range facilities" />
            <img src="/assets/range-image-4.avif" alt="Kiowa Gun Club range" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

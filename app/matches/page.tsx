import { eq, asc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections, matches, matchPhotos } from "@/lib/schema";
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
  const photos = await db.select().from(matchPhotos).orderBy(asc(matchPhotos.sortOrder));

  const photosByMatch = new Map<number, typeof photos>();
  for (const photo of photos) {
    if (!photosByMatch.has(photo.matchId)) photosByMatch.set(photo.matchId, []);
    photosByMatch.get(photo.matchId)!.push(photo);
  }

  // Group by discipline while preserving each discipline's first-appearance
  // order in the (already sortOrder-sorted) schedule.
  const disciplineOrder: string[] = [];
  const scheduleByDiscipline = new Map<string, typeof schedule>();
  for (const row of schedule) {
    if (!scheduleByDiscipline.has(row.discipline)) {
      scheduleByDiscipline.set(row.discipline, []);
      disciplineOrder.push(row.discipline);
    }
    scheduleByDiscipline.get(row.discipline)!.push(row);
  }

  return (
    <>
      <Header active="matches" />
      <main className="container" id="main">
        <section id="matches" className="content-section">
          <h2>{intro?.heading}</h2>
          <div dangerouslySetInnerHTML={{ __html: intro?.bodyHtml ?? "" }} />

          {disciplineOrder.map((discipline) => {
            const rows = scheduleByDiscipline.get(discipline)!;
            const resultsList = (
              <ul className="match-results">
                {rows.map((row) => {
                  const rowPhotos = photosByMatch.get(row.id) ?? [];
                  return (
                    <li key={row.id}>
                      {row.resultsUrl ? (
                        <a href={row.resultsUrl} target="_blank" rel="noopener">
                          {row.eventDate}
                        </a>
                      ) : (
                        <>
                          {row.eventDate}{" "}
                          <span className="results-pending">(results not yet posted)</span>
                        </>
                      )}
                      {rowPhotos.length > 0 && (
                        <div className="match-gallery">
                          {rowPhotos.map((p) => (
                            <img key={p.id} src={`/api/match-photos/${p.id}`} alt="" />
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            );

            return (
              <div key={discipline} className="discipline-group">
                <h3>{discipline}</h3>
                <div className="match-schedule-wrap">
                  <table className="match-schedule">
                    <caption className="sr-only">{discipline} match schedule</caption>
                    <thead>
                      <tr>
                        <th scope="col">Date</th>
                        <th scope="col">Time</th>
                        <th scope="col">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.eventDate}</td>
                          <td>{row.eventTime}</td>
                          <td>{row.notes ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {discipline === "Defensive Pistol" ? (
                  <div className="results-body">
                    <FlyerModal src="/assets/pistol-flyer.avif" alt="Defensive pistol match flyer" />
                    <div>
                      <h4>Results</h4>
                      {resultsList}
                    </div>
                  </div>
                ) : (
                  <>
                    <h4>Results</h4>
                    {resultsList}
                  </>
                )}
              </div>
            );
          })}
        </section>
      </main>
      <Footer />
    </>
  );
}

import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CalendarView from "@/components/CalendarView";
import EditableSection from "@/components/EditableSection";
import AdditionalSections from "@/components/AdditionalSections";
import EditModeBanner from "@/components/EditModeBanner";
import "../styles/calendar.css";

export const metadata = { title: "Calendar - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const db = await getDb();
  const [sections, admin] = await Promise.all([
    db.select().from(pageSections).where(eq(pageSections.pageSlug, "calendar")),
    getCurrentAdmin(),
  ]);
  const intro = sections.find((s) => s.sectionKey === "intro");

  return (
    <>
      <Header active="calendar" />
      <main className="container" id="main">
        {admin && <EditModeBanner name={admin.name} />}
        <section id="calendar" className="content-section">
          <h1>Calendar</h1>
          {intro && (
            <EditableSection
              id={intro.id}
              heading={intro.heading}
              bodyHtml={intro.bodyHtml}
              isAdmin={!!admin}
            />
          )}
          <CalendarView isAdmin={!!admin} />
        </section>

        <AdditionalSections pageSlug="calendar" sections={sections} isAdmin={!!admin} />
      </main>
      <Footer />
    </>
  );
}

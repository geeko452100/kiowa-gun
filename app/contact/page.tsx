import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = { title: "Contact Us - Kiowa Gun Club" };
export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const db = await getDb();
  const sections = await db
    .select()
    .from(pageSections)
    .where(eq(pageSections.pageSlug, "contact"));
  const details = sections.find((s) => s.sectionKey === "details");

  return (
    <>
      <Header active="contact" />
      <main className="container" id="main">
        <section id="contact" className="content-section">
          <h1>Let&apos;s Talk</h1>
          <h2>{details?.heading}</h2>
          <div dangerouslySetInnerHTML={{ __html: details?.bodyHtml ?? "" }} />
        </section>
      </main>
      <Footer />
    </>
  );
}

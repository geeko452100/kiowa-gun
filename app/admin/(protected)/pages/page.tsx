import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import PageSectionForm from "@/components/admin/PageSectionForm";

export default async function AdminPagesPage() {
  const db = await getDb();
  const sections = await db.select().from(pageSections);

  return (
    <div>
      <h1>Page Text</h1>
      <p className="admin-note">
        Edit the text blocks that appear on the public pages. Body text supports basic HTML (e.g.{" "}
        {"<p>"}, {"<ul><li>"}, {"<a href=\"...\">"}).
      </p>
      {sections.map((s) => (
        <PageSectionForm
          key={s.id}
          id={s.id}
          pageSlug={s.pageSlug}
          sectionKey={s.sectionKey}
          heading={s.heading}
          bodyHtml={s.bodyHtml}
        />
      ))}
    </div>
  );
}

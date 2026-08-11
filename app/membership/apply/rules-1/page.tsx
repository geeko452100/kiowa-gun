import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { pageSections } from "@/lib/schema";
import RulesPageStep from "@/components/apply/RulesPageStep";

export const dynamic = "force-dynamic";

export default async function RulesPage1() {
  const db = await getDb();
  const sections = await db.select().from(pageSections).where(eq(pageSections.pageSlug, "agreement"));
  const introSection = sections.find((s) => s.sectionKey === "intro");

  return (
    <RulesPageStep
      pageIndex={0}
      stepNumber={2}
      backPath="/membership/apply"
      nextPath="/membership/apply/rules-2"
      introHtml={introSection?.bodyHtml ?? undefined}
    />
  );
}

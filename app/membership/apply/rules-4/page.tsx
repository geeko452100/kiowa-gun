import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { documents } from "@/lib/schema";
import SignStep from "@/components/apply/SignStep";

export const dynamic = "force-dynamic";

export default async function RulesPage4() {
  const db = await getDb();
  const rulesDocuments = await db.select().from(documents).where(eq(documents.category, "membership"));

  return <SignStep rulesDocuments={rulesDocuments.map((d) => ({ id: d.id, title: d.title }))} />;
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDb } from "@/lib/db";
import { calendarEvents } from "@/lib/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getDb();
  const [event] = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, Number(id)))
    .limit(1);

  if (!event?.documentR2Key) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const object = await env.DOCS.get(event.documentR2Key);
  if (!object) {
    return NextResponse.json({ error: "Document missing from storage" }, { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${event.documentFileName ?? "event-document.pdf"}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { smsCampaignRecipients } from "@/lib/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId)) {
    return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
  }

  const db = await getDb();
  const rows = await db
    .select()
    .from(smsCampaignRecipients)
    .where(eq(smsCampaignRecipients.campaignId, campaignId));
  return NextResponse.json(rows);
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { smsCampaigns, smsCampaignRecipients } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isInteger(campaignId)) {
    return NextResponse.json({ error: "Invalid campaign id" }, { status: 400 });
  }
  const db = await getDb();
  await db.delete(smsCampaignRecipients).where(eq(smsCampaignRecipients.campaignId, campaignId));
  await db.delete(smsCampaigns).where(eq(smsCampaigns.id, campaignId));
  return NextResponse.json({ ok: true });
}

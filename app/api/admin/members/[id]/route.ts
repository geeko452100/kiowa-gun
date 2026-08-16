import { NextResponse } from "next/server";
import { eq, sql, and } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members, MEMBER_STATUSES, membershipInvoices, pageSections } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { recomputeCanPay } from "@/lib/members";
import { sendAdminEmail } from "@/lib/email";
import { DUES_AMOUNT_CENTS } from "@/lib/constants";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const {
    name,
    email,
    phone,
    address,
    status,
    renewalDate,
    onShootingCommittee,
    onBoard,
    smsOptIn,
    backgroundCheckCleared,
    nraActive,
  } = (await request.json()) as {
    name: string;
    email: string;
    phone?: string;
    address?: string;
    status: string;
    renewalDate?: string | null;
    onShootingCommittee?: boolean;
    onBoard?: boolean;
    smsOptIn?: boolean;
    backgroundCheckCleared?: boolean;
    nraActive?: boolean;
  };
  if (!MEMBER_STATUSES.includes(status as (typeof MEMBER_STATUSES)[number])) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const db = await getDb();
  const targetId = Number(id);
  const [existing] = await db.select().from(members).where(eq(members.id, targetId));
  if (!existing) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  await db
    .update(members)
    .set({
      name,
      email: String(email).toLowerCase().trim(),
      phone: phone || null,
      address: address || null,
      status,
      renewalDate: renewalDate || null,
      onShootingCommittee: onShootingCommittee ? 1 : 0,
      onBoard: onBoard ? 1 : 0,
      smsOptIn: smsOptIn ? 1 : 0,
      ...(smsOptIn && !existing.smsOptIn ? { smsOptInAt: sql`CURRENT_TIMESTAMP` } : {}),
      // The cached carrier (lib/sms.ts) is only valid for the phone number it
      // was looked up for -- clear it so the next send re-queries Veriphone
      // instead of texting the old number's gateway.
      ...((phone || null) !== existing.phone ? { carrier: null } : {}),
      ...(backgroundCheckCleared !== undefined ? { backgroundCheckCleared: backgroundCheckCleared ? 1 : 0 } : {}),
      ...(nraActive !== undefined ? { nraActive: nraActive ? 1 : 0 } : {}),
    })
    .where(eq(members.id, targetId));

  await recomputeCanPay(db, targetId);

  // A new applicant's background check just got cleared for the first time --
  // send them their dues invoice + orientation info. Guarded on the 0 -> 1
  // transition so re-saving the member row afterward doesn't re-send it.
  if (backgroundCheckCleared && !existing.backgroundCheckCleared) {
    const token = crypto.randomUUID();
    await db.insert(membershipInvoices).values({ memberId: targetId, token, amountCents: DUES_AMOUNT_CENTS });

    const [orientation] = await db
      .select()
      .from(pageSections)
      .where(and(eq(pageSections.pageSlug, "membership"), eq(pageSections.sectionKey, "orientation-schedule")));

    const origin = new URL(request.url).origin;
    const payLink = `${origin}/membership/pay/${token}`;
    await sendAdminEmail(
      String(email).toLowerCase().trim(),
      "Your Kiowa Gun Club Application Was Approved",
      `<p>Good news — your background check has been cleared.</p>
       <p><a href="${payLink}">Pay your $${(DUES_AMOUNT_CENTS / 100).toFixed(2)} dues</a> to complete your membership.</p>
       ${orientation?.bodyHtml ?? ""}`
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = await getDb();
  await db.delete(members).where(eq(members.id, Number(id)));
  return NextResponse.json({ ok: true });
}

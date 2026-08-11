import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { members } from "@/lib/schema";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as
    | { email?: string; printedName?: string; signature?: string; agree?: boolean }
    | null;

  const email = body?.email?.trim().toLowerCase() ?? "";
  const printedName = body?.printedName?.trim() ?? "";
  const signature = body?.signature?.trim() ?? "";
  const agree = body?.agree === true;

  if (!email || !printedName || !signature || !agree) {
    return NextResponse.json(
      { error: "Please check the box, then print and sign your name to confirm you've read and agree to the Range Rules." },
      { status: 400 }
    );
  }

  if (printedName.split(/\s+/).length < 2) {
    return NextResponse.json(
      { error: "Please enter your full name (first and last) in the Printed Name field." },
      { status: 400 }
    );
  }

  if (signature.toLowerCase() !== printedName.toLowerCase()) {
    return NextResponse.json(
      { error: "Your typed signature must exactly match the name you entered in Printed Name." },
      { status: 400 }
    );
  }

  const db = await getDb();
  const now = new Date().toISOString();
  const [existing] = await db.select().from(members).where(eq(members.email, email));

  if (existing) {
    await db
      .update(members)
      .set({
        rulesAcknowledgedPrintedName: printedName,
        rulesAcknowledgedName: signature,
        rulesAcknowledgedAt: now,
      })
      .where(eq(members.id, existing.id));
  } else {
    await db.insert(members).values({
      name: printedName,
      email,
      status: "Waiting List",
      rulesAcknowledgedPrintedName: printedName,
      rulesAcknowledgedName: signature,
      rulesAcknowledgedAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}

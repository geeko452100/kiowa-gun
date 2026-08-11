import { NextResponse } from "next/server";
import { getCurrentMember } from "@/lib/memberAuth";
import { sendVerificationEmail } from "@/lib/portalVerification";

export async function POST(request: Request) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (member.emailVerified) {
    return NextResponse.json({ error: "Already verified" }, { status: 400 });
  }

  await sendVerificationEmail(new URL(request.url).origin, member.id, member.email);
  return NextResponse.json({ ok: true });
}

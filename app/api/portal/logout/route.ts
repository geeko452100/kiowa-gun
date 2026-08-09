import { NextResponse } from "next/server";
import { destroyMemberSession } from "@/lib/memberAuth";

export async function POST() {
  await destroyMemberSession();
  return NextResponse.json({ ok: true });
}

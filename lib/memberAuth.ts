import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { members, memberSessions } from "./schema";
import { MEMBER_SESSION_COOKIE } from "./constants";

// Same TTL as the admin session (lib/auth.ts) -- no reason for portal
// sessions to behave differently.
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function toHex(buffer: ArrayBuffer | Uint8Array) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createMemberSession(memberId: number) {
  const db = await getDb();
  const id = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db.insert(memberSessions).values({ id, memberId, expiresAt });
  const store = await cookies();
  store.set(MEMBER_SESSION_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  return id;
}

export async function destroyMemberSession() {
  const store = await cookies();
  const id = store.get(MEMBER_SESSION_COOKIE)?.value;
  if (id) {
    const db = await getDb();
    await db.delete(memberSessions).where(eq(memberSessions.id, id));
  }
  store.delete(MEMBER_SESSION_COOKIE);
}

export async function getCurrentMember() {
  const store = await cookies();
  const id = store.get(MEMBER_SESSION_COOKIE)?.value;
  if (!id) return null;

  const db = await getDb();
  const [session] = await db.select().from(memberSessions).where(eq(memberSessions.id, id)).limit(1);
  if (!session || session.expiresAt < Date.now()) return null;

  const [member] = await db.select().from(members).where(eq(members.id, session.memberId)).limit(1);
  return member ?? null;
}

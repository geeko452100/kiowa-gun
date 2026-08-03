import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { adminUsers, sessions } from "./schema";
import { SESSION_COOKIE } from "./constants";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function toHex(buffer: ArrayBuffer | Uint8Array) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256
  );
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2(password, salt);
  return { hash: toHex(derived), salt: toHex(salt) };
}

// Random token for one-time password-setup/reset links (see passwordResetTokens).
export function generateToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

// A password nobody will ever type: used as the initial passwordHash for a
// newly-invited board member so their login is unusable until they set a
// real password via the emailed link.
export async function hashRandomPlaceholderPassword() {
  return hashPassword(generateToken());
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const derived = await pbkdf2(password, fromHex(salt));
  const derivedHex = toHex(derived);
  if (derivedHex.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < derivedHex.length; i++) {
    diff |= derivedHex.charCodeAt(i) ^ hash.charCodeAt(i);
  }
  return diff === 0;
}

// Fixed salt/hash pair used to verify against when an email doesn't match any
// admin, so login still pays the full PBKDF2 cost either way — otherwise a
// fast rejection for unknown emails vs. a slow one for known emails would let
// an attacker use response timing to find out which admin emails exist.
export const DUMMY_SALT = "00".repeat(16);
export const DUMMY_HASH = "00".repeat(32);

export const MAX_FAILED_LOGIN_ATTEMPTS = 8;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function createSession(adminUserId: number) {
  const db = await getDb();
  const id = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = Date.now() + SESSION_TTL_MS;
  await db.insert(sessions).values({ id, adminUserId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(expiresAt),
  });
  return id;
}

export async function destroySession() {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) {
    const db = await getDb();
    await db.delete(sessions).where(eq(sessions.id, id));
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentAdmin() {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  const db = await getDb();
  const [session] = await db.select().from(sessions).where(eq(sessions.id, id)).limit(1);
  if (!session || session.expiresAt < Date.now()) return null;

  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, session.adminUserId))
    .limit(1);
  return admin ?? null;
}

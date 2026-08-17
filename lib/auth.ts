import "server-only";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { getDb } from "./db";
import { adminUsers, sessions } from "./schema";
import { SESSION_COOKIE } from "./constants";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const REMEMBER_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

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

// OWASP-recommended minimum for PBKDF2-HMAC-SHA256 (current cheat sheet). The
// Cloudflare Workers runtime only exposes SubtleCrypto, which doesn't support
// bcrypt/argon2/scrypt, so PBKDF2 is the strongest option available here.
const PBKDF2_ITERATIONS = 600_000;

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
}

// Stored hashes are "<iterations>:<hex>" so a future bump to PBKDF2_ITERATIONS
// doesn't invalidate hashes written under a lower count -- verifyPassword
// reads the count straight off the hash instead of assuming the current
// constant. Hashes with no prefix predate this format and used 100_000.
function parseHash(hash: string): { iterations: number; hex: string } {
  const sep = hash.indexOf(":");
  if (sep === -1) return { iterations: 100_000, hex: hash };
  return { iterations: Number(hash.slice(0, sep)), hex: hash.slice(sep + 1) };
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return { hash: `${PBKDF2_ITERATIONS}:${toHex(derived)}`, salt: toHex(salt) };
}

// True when a stored hash was written under a lower iteration count than the
// current PBKDF2_ITERATIONS -- callers that just verified a password against
// this hash should rehash and persist it at the current cost.
export function needsRehash(hash: string) {
  return parseHash(hash).iterations < PBKDF2_ITERATIONS;
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
  const { iterations, hex } = parseHash(hash);
  const derived = await pbkdf2(password, fromHex(salt), iterations);
  const derivedHex = toHex(derived);
  if (derivedHex.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < derivedHex.length; i++) {
    diff |= derivedHex.charCodeAt(i) ^ hex.charCodeAt(i);
  }
  return diff === 0;
}

// Fixed salt/hash pair used to verify against when an email doesn't match any
// admin, so login still pays the full PBKDF2 cost either way — otherwise a
// fast rejection for unknown emails vs. a slow one for known emails would let
// an attacker use response timing to find out which admin emails exist.
export const DUMMY_SALT = "00".repeat(16);
export const DUMMY_HASH = `${PBKDF2_ITERATIONS}:${"00".repeat(32)}`;

export const MAX_FAILED_LOGIN_ATTEMPTS = 8;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export async function createSession(adminUserId: number, remember = false) {
  const db = await getDb();
  const id = toHex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = Date.now() + (remember ? REMEMBER_SESSION_TTL_MS : SESSION_TTL_MS);
  await db.insert(sessions).values({ id, adminUserId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    // Omitting `expires` for a non-"remember me" login makes it a session
    // cookie that the browser clears on close, even though the underlying
    // DB session still lives for SESSION_TTL_MS -- so a closed browser
    // forces re-login but a left-open tab doesn't get logged out early.
    ...(remember ? { expires: new Date(expiresAt) } : {}),
  });
  return id;
}

// Invalidates every other active session for this admin -- called right
// after a password change/reset so a stolen session cookie doesn't survive
// it. Scoped to "other" sessions (not the current one) by the caller passing
// currentSessionId, so a self-service password change doesn't log the admin
// themselves out.
export async function destroyOtherSessions(adminUserId: number, currentSessionId?: string) {
  const db = await getDb();
  await db
    .delete(sessions)
    .where(
      currentSessionId
        ? and(eq(sessions.adminUserId, adminUserId), ne(sessions.id, currentSessionId))
        : eq(sessions.adminUserId, adminUserId)
    );
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

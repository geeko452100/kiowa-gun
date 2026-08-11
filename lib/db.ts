import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return drizzle(env.DB, { schema });
}

// Two concurrent requests can both pass a pre-write "is this taken?" SELECT
// and then both write -- that check is inherently racy. The reliable way to
// enforce uniqueness is a DB constraint (see e.g. migration 0029) plus
// catching the failure here, not a check-then-act read beforehand.
export function isUniqueConstraintError(err: unknown, column?: string): boolean {
  // drizzle-orm wraps the real driver error in DrizzleQueryError, whose own
  // .message is just "Failed query: ..." -- the actual SQLite message
  // ("UNIQUE constraint failed: ...") only shows up on .cause.
  for (let e = err; e instanceof Error; e = e.cause) {
    if (/unique constraint/i.test(e.message)) {
      return column ? e.message.includes(column) : true;
    }
  }
  return false;
}

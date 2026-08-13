import "server-only";
import { inArray } from "drizzle-orm";
import { getDb } from "./db";
import { siteImages } from "./schema";

// Resolves a set of site-image keys to their public serving URL if a board
// member has uploaded a replacement, or null if the caller should fall back
// to its bundled default asset. See lib/schema.ts siteImages for why a
// missing row just means "use the default" instead of an error state.
export async function resolveSiteImages(keys: string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  for (const key of keys) result[key] = null;
  if (keys.length === 0) return result;

  const db = await getDb();
  const rows = await db.select().from(siteImages).where(inArray(siteImages.key, keys));
  // Cache-bust with the r2Key: the served URL is otherwise identical before
  // and after a replacement, so browsers (esp. their in-memory cache for
  // small, repeatedly-requested assets like the nav logo) can keep showing
  // the old bitmap even after router.refresh() re-renders with a "new" src.
  for (const row of rows) result[row.key] = `/api/site-images/${row.key}?v=${encodeURIComponent(row.r2Key)}`;
  return result;
}

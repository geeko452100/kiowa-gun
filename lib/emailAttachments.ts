import type { EmailAttachment } from "@/lib/email";

const INLINE_IMAGE_PREFIX = "email-images/";
const FILE_ATTACHMENT_PREFIX = "email-attachments/";
export const MAX_FILE_ATTACHMENTS = 5;

// Raw (pre-base64) budget for the combined inline images + file attachments.
// Base64 adds ~37%; leaving room for the HTML body and JSON overhead keeps
// the whole request under Resend's 40MB total-message cap.
export const MAX_TOTAL_ATTACHMENT_BYTES = 20 * 1024 * 1024;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

// Resolves everything a composed email references into what Resend needs:
// composer images (uploaded to R2 as <img src="{origin}/api/email-images/{key}">
// for a live preview while editing) become inline CID attachments, and
// board-picked files become plain downloadable ones. Both are validated
// against a combined size budget and their own upload namespace -- refs come
// straight from client JSON, so an r2Key/URL outside our own prefixes must
// never be trusted to point where the caller says it does.
export async function buildEmailAttachments(
  html: string,
  fileRefs: { r2Key: string; fileName: string }[],
  docs: R2Bucket
): Promise<
  { ok: true; html: string; attachments: EmailAttachment[] } | { ok: false; error: string }
> {
  const keyPattern = /(["'])(?:https?:\/\/[^"']*)?\/api\/email-images\/([^"'?]+)\1/g;
  const inlineKeys = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = keyPattern.exec(html))) {
    inlineKeys.add(match[2]);
  }

  if (fileRefs.length > MAX_FILE_ATTACHMENTS) {
    return { ok: false, error: `Attach at most ${MAX_FILE_ATTACHMENTS} files.` };
  }
  for (const ref of fileRefs) {
    if (!ref.r2Key.startsWith(FILE_ATTACHMENT_PREFIX)) {
      return { ok: false, error: "Invalid attachment reference." };
    }
  }

  // Check total size via HEAD (metadata only) before downloading any bytes,
  // so an over-budget request fails fast instead of paying for the transfer.
  let totalBytes = 0;
  for (const key of inlineKeys) {
    const head = await docs.head(`${INLINE_IMAGE_PREFIX}${key}`);
    if (head) totalBytes += head.size;
  }
  for (const ref of fileRefs) {
    const head = await docs.head(ref.r2Key);
    if (head) totalBytes += head.size;
  }
  if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
    return {
      ok: false,
      error: `Attachments are too large (${formatMB(totalBytes)}MB combined). Remove some images or files -- the total must stay under ${formatMB(MAX_TOTAL_ATTACHMENT_BYTES)}MB.`,
    };
  }

  let processedHtml = html;
  const attachments: EmailAttachment[] = [];

  for (const key of inlineKeys) {
    const object = await docs.get(`${INLINE_IMAGE_PREFIX}${key}`);
    if (!object) continue;
    const content = arrayBufferToBase64(await object.arrayBuffer());
    const contentType = object.httpMetadata?.contentType ?? "image/jpeg";
    attachments.push({ filename: key, content, content_type: contentType, content_id: key });
    processedHtml = processedHtml.replace(
      new RegExp(`(["'])(?:https?:\\/\\/[^"']*)?\\/api\\/email-images\\/${escapeRegExp(key)}\\1`, "g"),
      `$1cid:${key}$1`
    );
  }

  for (const ref of fileRefs) {
    const object = await docs.get(ref.r2Key);
    if (!object) continue;
    const content = arrayBufferToBase64(await object.arrayBuffer());
    const contentType = object.httpMetadata?.contentType ?? "application/octet-stream";
    attachments.push({ filename: ref.fileName, content, content_type: contentType });
  }

  return { ok: true, html: processedHtml, attachments };
}

import "server-only";

// Browsers send whatever Content-Type the client-side code set on the
// multipart part -- trivial to spoof (e.g. a script uploading an HTML/SVG
// file labeled "image/png"). This checks the file's actual leading bytes
// against the format its declared type claims, so an upload endpoint's
// allowlist can't be bypassed by lying about the type.
const SIGNATURES: Record<string, (head: Uint8Array) => boolean> = {
  "application/pdf": (h) => startsWith(h, [0x25, 0x50, 0x44, 0x46]), // %PDF
  "image/jpeg": (h) => startsWith(h, [0xff, 0xd8, 0xff]),
  "image/png": (h) => startsWith(h, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/gif": (h) => startsWith(h, [0x47, 0x49, 0x46, 0x38]), // "GIF8"
  "image/webp": (h) => startsWith(h, [0x52, 0x49, 0x46, 0x46]) && matchesAscii(h, 8, "WEBP"), // "RIFF"...."WEBP"
  "image/avif": (h) => matchesAscii(h, 4, "ftyp") && (matchesAscii(h, 8, "avif") || matchesAscii(h, 8, "avis")),
};

function startsWith(head: Uint8Array, signature: number[]): boolean {
  return signature.length <= head.length && signature.every((byte, i) => head[i] === byte);
}

function matchesAscii(head: Uint8Array, offset: number, ascii: string): boolean {
  if (head.length < offset + ascii.length) return false;
  for (let i = 0; i < ascii.length; i++) {
    if (head[offset + i] !== ascii.charCodeAt(i)) return false;
  }
  return true;
}

// True only when `file.type` is one of the checked formats above AND the
// file's actual bytes match that format's signature.
export async function hasValidFileSignature(file: File): Promise<boolean> {
  const check = SIGNATURES[file.type];
  if (!check) return false;
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  return check(head);
}

import { hasValidFileSignature } from "./fileSignature";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_BYTES = 5 * 1024 * 1024;

// Shared by the calendar admin create and edit routes so both give board
// members the same plain-language error instead of a raw upload failure.
export async function validateCalendarImage(file: File): Promise<string | null> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Image must be a JPG, PNG, GIF, or WEBP file.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be smaller than 5MB.";
  }
  if (!(await hasValidFileSignature(file))) {
    return "That file doesn't look like a valid image.";
  }
  return null;
}

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

// Attached document for a calendar event (flyer, sign-up sheet, etc.) --
// PDF-only, same convention as the general admin document library.
export async function validateCalendarDocument(file: File): Promise<string | null> {
  if (file.type !== "application/pdf") {
    return "Document must be a PDF file.";
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return "Document must be smaller than 10MB.";
  }
  if (!(await hasValidFileSignature(file))) {
    return "That file doesn't look like a valid PDF.";
  }
  return null;
}

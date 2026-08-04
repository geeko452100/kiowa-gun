const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

// Shared by the calendar admin create and edit routes so both give board
// members the same plain-language error instead of a raw upload failure.
export function validateCalendarImage(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Image must be a JPG, PNG, GIF, or WEBP file.";
  }
  if (file.size > MAX_BYTES) {
    return "Image must be smaller than 5MB.";
  }
  return null;
}

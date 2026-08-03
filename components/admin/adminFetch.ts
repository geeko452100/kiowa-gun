"use client";

// Thin wrapper so every admin screen fails the same way: a plain-language
// message instead of a silent no-op, and a redirect to login (not a stuck
// page) if the 8-hour session has expired mid-edit.
export async function adminFetch<T = unknown>(
  input: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    return { ok: false, error: "Couldn't reach the server. Check your internet connection and try again." };
  }

  if (res.status === 401) {
    window.location.href = "/admin/login?expired=1";
    return { ok: false, error: "Your session expired." };
  }

  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    return { ok: false, error: (data as { error?: string })?.error ?? "Something went wrong. Please try again." };
  }
  return { ok: true, data };
}

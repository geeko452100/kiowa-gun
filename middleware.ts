import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/constants";

// Pages/APIs reachable without a session — the login form itself, and the
// public self-service password flows (each secured its own way: a one-time
// emailed token, not a session cookie).
const PUBLIC_ADMIN_PATHS = new Set([
  "/admin/login",
  "/admin/reset-password",
  "/admin/forgot-password",
  "/api/admin/login",
  "/api/admin/reset-password",
  "/api/admin/forgot-password",
]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.has(pathname);
  const isAdminApi = pathname.startsWith("/api/admin") && !PUBLIC_ADMIN_PATHS.has(pathname);

  if (isAdminRoute || isAdminApi) {
    const hasCookie = request.cookies.has(SESSION_COOKIE);
    if (!hasCookie) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // Keep the whole admin surface out of search results — it should never be
  // discoverable by anyone who isn't already told the URL directly.
  const response = NextResponse.next();
  if (pathname.startsWith("/admin")) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Every external origin the app actually loads content from:
// - secure.nmi.com: Collect.js (payment card iframes -- see components/nmi/CardFields.tsx)
// - cdn.jsdelivr.net: FullCalendar, loaded via next/script (components/CalendarView.tsx)
// - fonts.googleapis.com / fonts.gstatic.com: Google Fonts stylesheet + font files (app/layout.tsx)
// - www.google.com: the embedded range-location map (app/about/page.tsx)
// Nothing else should ever need adding here without updating this comment.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://secure.nmi.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://secure.nmi.com",
  "frame-src https://secure.nmi.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;

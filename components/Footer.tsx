import { eq } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/schema";
import { NAV_LINKS } from "@/lib/navLinks";

const SITE_LINKS = NAV_LINKS.filter((link) => link.slug !== "membership" && link.slug !== "portal");

const FOOTER_COLUMNS = [
  {
    heading: "Explore",
    links: SITE_LINKS,
  },
  {
    heading: "Membership",
    links: [
      ...NAV_LINKS.filter((link) => link.slug === "membership" || link.slug === "portal"),
      { href: "/admin/login", label: "Board Login" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/refund-policy", label: "Refund & Cancellation Policy" },
      { href: "/terms-of-service", label: "Terms of Service" },
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/shipping-policy", label: "Shipping Policy" },
    ],
  },
];

const SOCIAL_ICONS: Record<string, { label: string; path: string }> = {
  facebook: {
    label: "Facebook",
    path: "M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12",
  },
  instagram: {
    label: "Instagram",
    path: "M12 2c2.72 0 3.06.01 4.12.06 1.06.05 1.79.22 2.43.47.66.26 1.21.6 1.76 1.15.5.5.9 1.1 1.15 1.76.25.64.42 1.37.47 2.43.05 1.06.06 1.4.06 4.13s-.01 3.07-.06 4.13c-.05 1.06-.22 1.79-.47 2.43a4.9 4.9 0 0 1-1.15 1.76 4.9 4.9 0 0 1-1.76 1.15c-.64.25-1.37.42-2.43.47-1.06.05-1.4.06-4.12.06s-3.07-.01-4.13-.06c-1.06-.05-1.79-.22-2.43-.47a4.9 4.9 0 0 1-1.76-1.15 4.9 4.9 0 0 1-1.15-1.76c-.25-.64-.42-1.37-.47-2.43C2.01 15.07 2 14.73 2 12s.01-3.07.06-4.13c.05-1.06.22-1.79.47-2.43.26-.66.6-1.21 1.15-1.76a4.9 4.9 0 0 1 1.76-1.15c.64-.25 1.37-.42 2.43-.47C8.93 2.01 9.27 2 12 2m0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10m0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4M17.4 5.4a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4",
  },
  youtube: {
    label: "YouTube",
    path: "M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8M9.6 15.6V8.4l6.3 3.6z",
  },
};

export default async function Footer() {
  const db = await getDb();
  const [settings] = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);

  const socials = [
    settings?.socialFacebook && { key: "facebook", href: settings.socialFacebook },
    settings?.socialInstagram && { key: "instagram", href: settings.socialInstagram },
    settings?.socialYoutube && { key: "youtube", href: settings.socialYoutube },
  ].filter((s): s is { key: string; href: string } => !!s);

  const hasContact = !!(settings?.contactPhone || settings?.contactAddress || socials.length);

  return (
    <footer className="site-footer">
      <div className="container footer-columns">
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.heading} className="footer-column">
            <h2 className="footer-column-heading">{column.heading}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="footer-column">
          <h2 className="footer-column-heading">Get Involved</h2>
          <a
            className="nra-link"
            href="https://membership.nra.org/"
            target="_blank"
            rel="noopener"
          >
            Join the NRA
          </a>
        </div>

        {hasContact && (
          <div className="footer-column">
            <h2 className="footer-column-heading">Get in Touch</h2>
            {settings?.contactPhone && (
              <a className="footer-contact-line" href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}>
                {settings.contactPhone}
              </a>
            )}
            {settings?.contactAddress && (
              <a
                className="footer-contact-line"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.contactAddress)}`}
                target="_blank"
                rel="noopener"
              >
                {settings.contactAddress}
              </a>
            )}
            {socials.length > 0 && (
              <div className="footer-social">
                {socials.map((s) => (
                  <a
                    key={s.key}
                    href={s.href}
                    target="_blank"
                    rel="noopener"
                    aria-label={SOCIAL_ICONS[s.key].label}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                      <path d={SOCIAL_ICONS[s.key].path} />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="container footer-bottom">
        <p>&copy; {new Date().getFullYear()} Kiowa Gun Club. All rights reserved.</p>
      </div>
    </footer>
  );
}

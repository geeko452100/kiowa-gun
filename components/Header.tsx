import { eq } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { resolveSiteImages } from "@/lib/siteImages";
import NavToggle from "./NavToggle";
import NavEditPanel from "./NavEditPanel";

const NAV_LINKS = [
  { href: "/", label: "Home", slug: "home" },
  { href: "/calendar", label: "Calendar", slug: "calendar" },
  { href: "/about", label: "About Us / Map", slug: "about" },
  { href: "/rules", label: "Range Rules", slug: "rules" },
  { href: "/membership", label: "Membership Info", slug: "membership" },
  { href: "/matches", label: "Matches", slug: "matches" },
  { href: "/contact", label: "Contact Us", slug: "contact" },
  { href: "/portal", label: "Member Portal", slug: "portal" },
];

export default async function Header({ active }: { active: string }) {
  const db = await getDb();
  const [admin, images, [settings]] = await Promise.all([
    getCurrentAdmin(),
    resolveSiteImages(["nav-logo", "nav-hero"]),
    db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1),
  ]);
  const isAdmin = !!admin;
  const title = settings?.navTitle ?? "Kiowa Gun Club";
  const subtitle = settings?.navSubtitle ?? "Great Bend, Kansas";
  const size = settings?.navTitleSize ?? "comfortable";

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          <img
            src={images["nav-logo"] ?? "/assets/kiowa-gun.avif"}
            alt="Kiowa Gun Club emblem"
            width={60}
            height={60}
          />
          <span className={`site-title site-title-${size}`}>
            {title}
            {subtitle && (
              <>
                <br />
                <small>{subtitle}</small>
              </>
            )}
          </span>
        </Link>

        <div className="hero-image">
          <img
            src={images["nav-hero"] ?? "/assets/gun-club.avif"}
            alt="Kiowa Gun Club range"
            width={1100}
            height={190}
          />
        </div>

        <NavToggle>
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.slug}>
                <Link href={link.href} aria-current={active === link.slug ? "page" : undefined}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                className="nra-link"
                href="https://membership.nra.org/"
                target="_blank"
                rel="noopener"
              >
                Join the NRA
              </a>
            </li>
          </ul>
        </NavToggle>
      </div>

      {isAdmin && (
        <div className="container nav-edit-container">
          <NavEditPanel
            logoHasOverride={!!images["nav-logo"]}
            heroHasOverride={!!images["nav-hero"]}
            title={title}
            subtitle={subtitle}
            size={size}
          />
        </div>
      )}
    </header>
  );
}

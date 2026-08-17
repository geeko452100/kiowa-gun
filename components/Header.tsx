import { eq } from "drizzle-orm";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { siteSettings } from "@/lib/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { getCurrentMember } from "@/lib/memberAuth";
import { resolveSiteImages } from "@/lib/siteImages";
import { NAV_LINKS } from "@/lib/navLinks";
import NavToggle from "./NavToggle";
import NavEditPanel from "./NavEditPanel";
import AccountMenu from "./AccountMenu";
import StickyHeader from "./StickyHeader";

export default async function Header({ active }: { active: string }) {
  const db = await getDb();
  const [admin, member, images, [settings]] = await Promise.all([
    getCurrentAdmin(),
    getCurrentMember(),
    resolveSiteImages(["nav-logo", "nav-hero"]),
    db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1),
  ]);
  const isAdmin = !!admin;
  const title = settings?.navTitle ?? "Kiowa Gun Club";
  const subtitle = settings?.navSubtitle ?? "Great Bend, Kansas";
  const size = settings?.navTitleSize ?? "comfortable";

  // Board members and standard members are two separate login systems
  // (admin_users vs members) with their own profile pages -- this surfaces
  // whichever one applies as a single "my account" entry point in the nav,
  // similar to Amazon/eBay's account link, so it's visible from any page.
  const account = admin
    ? {
        href: "/admin/dashboard",
        name: admin.name,
        badge: "Board Member" as const,
        links: [
          { href: "/admin/dashboard", label: "Dashboard" },
          { href: "/admin/members", label: "Members" },
          { href: "/admin/payments", label: "Payments" },
          { href: "/admin/calendar", label: "Calendar" },
          { href: "/admin/documents", label: "Documents" },
        ],
      }
    : member
      ? {
          href: "/portal",
          name: member.name,
          badge: "Member" as const,
          links: [
            { href: "/portal", label: "My Info" },
            { href: "/portal#dues", label: "Dues Payment" },
            { href: "/portal#password", label: "Change Password" },
          ],
        }
      : null;

  return (
    <>
      <StickyHeader>
        <div className="container header-top">
          <Link href="/" className="logo">
            <img
              src={images["nav-logo"] ?? "/assets/kiowa-gun.avif"}
              alt="Kiowa Gun Club emblem"
              width={84}
              height={84}
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

          {account && <AccountMenu account={account} active={active} />}
        </div>

        <div className="container header-nav-bar-inner">
          <NavToggle>
            <ul>
              {NAV_LINKS.map((link) => (
                <li key={link.slug}>
                  <Link href={link.href} aria-current={active === link.slug ? "page" : undefined}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </NavToggle>
        </div>
      </StickyHeader>

      {active === "home" && (
        <div className="header-below-sticky">
          <div className="container hero-banner">
            <div className="hero-image">
              <img
                src={images["nav-hero"] ?? "/assets/kiowa-hero.avif"}
                alt="Kiowa Gun Club range"
                width={1400}
                height={190}
              />
            </div>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="header-below-sticky">
          <div className="container px-0 py-[10px]">
            <NavEditPanel
              logoHasOverride={!!images["nav-logo"]}
              heroHasOverride={!!images["nav-hero"]}
              title={title}
              subtitle={subtitle}
              size={size}
              contactPhone={settings?.contactPhone ?? ""}
              contactEmail={settings?.contactEmail ?? ""}
              contactAddress={settings?.contactAddress ?? ""}
              socialFacebook={settings?.socialFacebook ?? ""}
              socialInstagram={settings?.socialInstagram ?? ""}
              socialYoutube={settings?.socialYoutube ?? ""}
            />
          </div>
        </div>
      )}
    </>
  );
}

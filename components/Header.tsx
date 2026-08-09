import Image from "next/image";
import Link from "next/link";
import NavToggle from "./NavToggle";

const NAV_LINKS = [
  { href: "/", label: "Home", slug: "home" },
  { href: "/calendar", label: "Calendar", slug: "calendar" },
  { href: "/about", label: "About Us / Map", slug: "about" },
  { href: "/rules", label: "Range Rules", slug: "rules" },
  { href: "/membership", label: "Membership Info", slug: "membership" },
  { href: "/dues", label: "Pay Dues", slug: "dues" },
  { href: "/matches", label: "Matches", slug: "matches" },
  { href: "/contact", label: "Contact Us", slug: "contact" },
  { href: "/news", label: "News", slug: "news" },
  { href: "/portal", label: "Member Portal", slug: "portal" },
];

export default function Header({ active }: { active: string }) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="logo">
          <Image src="/assets/kiowa-gun.avif" alt="Kiowa Gun Club emblem" width={60} height={60} />
          <span className="site-title">
            Kiowa Gun Club
            <br />
            <small>Great Bend, Kansas</small>
          </span>
        </Link>

        <div className="hero-image">
          <Image
            src="/assets/gun-club.avif"
            alt="Kiowa Gun Club range"
            width={1100}
            height={190}
            priority
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
    </header>
  );
}

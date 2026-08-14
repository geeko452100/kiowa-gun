"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LogoutButton from "./LogoutButton";
import PortalLogoutButton from "./portal/PortalLogoutButton";

type AccountLink = { href: string; label: string };

type Account = {
  href: string;
  name: string;
  badge: "Board Member" | "Member";
  links: AccountLink[];
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
  return initials.toUpperCase();
}

export default function AccountMenu({
  account,
  active,
}: {
  account: Account;
  active: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const isBoard = account.badge === "Board Member";

  function hasHover() {
    return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function openNow() {
    if (!hasHover()) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function closeSoon() {
    if (!hasHover()) return;
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  useEffect(() => {
    if (!open) return;
    function onOutsideClick(e: Event) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("touchstart", onOutsideClick);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("touchstart", onOutsideClick);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="account-menu"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        className={`account-link account-link-${isBoard ? "board" : "member"}`}
        aria-current={active === "dashboard" || active === "portal" ? "page" : undefined}
        aria-haspopup="true"
        aria-expanded={open}
        title={`${account.name} (${account.badge})`}
        onClick={() => setOpen((o) => !o)}
      >
        {getInitials(account.name)}
      </button>

      <div className={`account-dropdown${open ? " is-open" : ""}`}>
        <div className="account-dropdown-header">
          <span className="account-dropdown-name">{account.name}</span>
          <span className="account-dropdown-badge">{account.badge}</span>
        </div>

        <ul className="account-dropdown-links">
          {account.links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="account-dropdown-footer" onClick={() => setOpen(false)}>
          {isBoard ? <LogoutButton /> : <PortalLogoutButton />}
        </div>
      </div>
    </div>
  );
}

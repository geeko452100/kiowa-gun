"use client";

import { useState } from "react";

export default function NavToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls="primary-nav"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="sr-only">Menu</span>
        <span className="nav-toggle-icon"></span>
      </button>
      <nav
        className={`main-nav${open ? " is-open" : ""}`}
        id="primary-nav"
        onClick={(e) => {
          if ((e.target as HTMLElement).tagName === "A") setOpen(false);
        }}
      >
        {children}
      </nav>
    </>
  );
}

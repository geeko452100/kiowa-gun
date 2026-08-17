"use client";

import { useEffect, useState } from "react";

export default function StickyHeader({ children }: { children: React.ReactNode }) {
  const [isStuck, setIsStuck] = useState(false);

  useEffect(() => {
    function onScroll() {
      setIsStuck(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <header className={`site-header${isStuck ? " is-stuck" : ""}`}>{children}</header>;
}

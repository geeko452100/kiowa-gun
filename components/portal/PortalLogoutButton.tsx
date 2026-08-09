"use client";

import { useRouter } from "next/navigation";

export default function PortalLogoutButton() {
  const router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch("/api/portal/logout", { method: "POST" });
        router.push("/portal/login");
        router.refresh();
      }}
    >
      <button type="submit">Log out</button>
    </form>
  );
}

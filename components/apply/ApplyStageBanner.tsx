"use client";

import { usePathname } from "next/navigation";

const STAGES = ["Range Rules", "Print and Sign", "Document Uploads", "Pay and Submit"] as const;

// Maps each wizard route to the stage it belongs under. The info step lives
// under "Range Rules" since it's the lead-in before reading/signing them.
function stageIndexForPath(pathname: string): number {
  if (pathname.includes("/apply/rules-4")) return 1;
  if (pathname.includes("/apply/documents")) return 2;
  if (pathname.includes("/apply/payment") || pathname.includes("/apply/complete")) return 3;
  return 0;
}

export default function ApplyStageBanner() {
  const pathname = usePathname();
  const activeIndex = stageIndexForPath(pathname);
  const isComplete = pathname.includes("/apply/complete");

  return (
    <nav className="apply-stage-banner" aria-label="Application stage">
      {STAGES.map((stage, i) => {
        const done = i < activeIndex || isComplete;
        const active = i === activeIndex && !isComplete;
        return (
          <div
            key={stage}
            className={`apply-stage${active ? " apply-stage-active" : ""}${done ? " apply-stage-done" : ""}`}
          >
            <span className="apply-stage-dot" aria-hidden="true">
              {done ? "✓" : i + 1}
            </span>
            <span className="apply-stage-label">{stage}</span>
          </div>
        );
      })}
    </nav>
  );
}

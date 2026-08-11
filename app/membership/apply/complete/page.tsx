"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApplyWizard } from "@/components/apply/ApplyWizardContext";

export default function CompleteStep() {
  const router = useRouter();
  const { paid } = useApplyWizard();

  useEffect(() => {
    if (!paid) router.replace("/membership/apply");
  }, [paid, router]);

  if (!paid) return null;

  return (
    <section className="apply-step apply-complete">
      <div className="apply-complete-check" aria-hidden="true">
        ✓
      </div>
      <h2>Application Complete</h2>
      <p>
        Thanks for applying! Your info, documents, and payment have all been received. A board
        member will review your uploaded documents shortly, and your membership status will be
        updated once approved.
      </p>
      <p>
        <Link href="/">Return to the home page</Link>
      </p>
    </section>
  );
}

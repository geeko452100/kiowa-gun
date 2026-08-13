"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApplyWizard } from "@/components/apply/ApplyWizardContext";
import ApplyProgressBar from "@/components/apply/ApplyProgressBar";

export default function PendingStep() {
  const router = useRouter();
  const { applicationSubmitted } = useApplyWizard();

  useEffect(() => {
    if (!applicationSubmitted) router.replace("/membership/apply");
  }, [applicationSubmitted, router]);

  if (!applicationSubmitted) return null;

  return (
    <section className="apply-step apply-complete">
      <ApplyProgressBar step={7} label="Application Submitted" />
      <div className="apply-complete-check" aria-hidden="true">
        ✓
      </div>
      <h1>Your Application Is Being Processed</h1>
      <p>
        You will receive an email once your background check is approved. That email will include
        a link to pay your dues and a schedule for your mandatory in-person range orientation.
      </p>
      <p>
        <Link href="/">Return to the home page</Link>
      </p>
    </section>
  );
}

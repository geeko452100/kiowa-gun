"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApplyWizard } from "@/components/apply/ApplyWizardContext";
import ApplyProgressBar from "@/components/apply/ApplyProgressBar";
import { RULES_PAGES } from "@/lib/rangeRules";

export default function RulesPageStep({
  pageIndex,
  stepNumber,
  backPath,
  nextPath,
  introHtml,
}: {
  pageIndex: number;
  stepNumber: number;
  backPath: string;
  nextPath: string;
  introHtml?: string;
}) {
  const router = useRouter();
  const { email, address } = useApplyWizard();
  const page = RULES_PAGES[pageIndex];
  const startNumber = RULES_PAGES.slice(0, pageIndex).reduce((n, p) => n + p.rules.length, 0) + 1;

  useEffect(() => {
    if (!email.trim() || !address.trim()) router.replace("/membership/apply");
  }, [email, address, router]);

  return (
    <section className="apply-step">
      <ApplyProgressBar step={stepNumber} label={`Range Rules (${pageIndex + 1} of 4)`} />
      <h2>Range Rules</h2>
      {introHtml && <div className="apply-step-intro" dangerouslySetInnerHTML={{ __html: introHtml }} />}
      <ol className="apply-rules-list" start={startNumber}>
        {page.rules.map((rule, i) => (
          <li key={startNumber + i}>{rule}</li>
        ))}
      </ol>
      {page.clauses.map((clause, i) => (
        <p key={i} className="apply-rules-clause">
          {clause}
        </p>
      ))}
      <div className="apply-step-nav">
        <button type="button" className="apply-step-back" onClick={() => router.push(backPath)}>
          Back
        </button>
        <button type="button" onClick={() => router.push(nextPath)}>
          Continue
        </button>
      </div>
    </section>
  );
}

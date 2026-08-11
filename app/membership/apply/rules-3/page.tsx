"use client";

import RulesPageStep from "@/components/apply/RulesPageStep";

export default function RulesPage3() {
  return (
    <RulesPageStep
      pageIndex={2}
      stepNumber={4}
      backPath="/membership/apply/rules-2"
      nextPath="/membership/apply/rules-4"
    />
  );
}

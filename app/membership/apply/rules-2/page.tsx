"use client";

import RulesPageStep from "@/components/apply/RulesPageStep";

export default function RulesPage2() {
  return (
    <RulesPageStep
      pageIndex={1}
      stepNumber={3}
      backPath="/membership/apply/rules-1"
      nextPath="/membership/apply/rules-3"
    />
  );
}

"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export const APPLY_STEP_PATHS = [
  "/membership/apply",
  "/membership/apply/rules-1",
  "/membership/apply/rules-2",
  "/membership/apply/rules-3",
  "/membership/apply/rules-4",
  "/membership/apply/documents",
  "/membership/apply/payment",
] as const;

export const APPLY_TOTAL_STEPS = APPLY_STEP_PATHS.length;

export type ApplicantType = "member" | "waitlist";

type ApplyWizardState = {
  // "member": renewing/current member, proves NRA membership.
  // "waitlist": new applicant, proves a passed background check (or CCL) instead.
  // See requirement 5.c.i vs 5.c.iii -- neither document is required of both groups.
  applicantType: ApplicantType | "";
  name: string;
  email: string;
  phone: string;
  smsOptIn: boolean;
  address: string;
  nraNumber: string;
  printedName: string;
  signature: string;
  agree: boolean;
  nraProofFile: File | null;
  backgroundCheckFile: File | null;
  discountCardFile: File | null;
  signed: boolean;
  applicationSubmitted: boolean;
  paid: boolean;
};

type ApplyWizardContextValue = ApplyWizardState & {
  update: (patch: Partial<ApplyWizardState>) => void;
};

const initialState: ApplyWizardState = {
  applicantType: "",
  name: "",
  email: "",
  phone: "",
  smsOptIn: false,
  address: "",
  nraNumber: "",
  printedName: "",
  signature: "",
  agree: false,
  nraProofFile: null,
  backgroundCheckFile: null,
  discountCardFile: null,
  signed: false,
  applicationSubmitted: false,
  paid: false,
};

const ApplyWizardContext = createContext<ApplyWizardContextValue | null>(null);

export function ApplyWizardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ApplyWizardState>(initialState);

  const value = useMemo<ApplyWizardContextValue>(
    () => ({
      ...state,
      update: (patch) => setState((prev) => ({ ...prev, ...patch })),
    }),
    [state]
  );

  return <ApplyWizardContext.Provider value={value}>{children}</ApplyWizardContext.Provider>;
}

export function useApplyWizard() {
  const ctx = useContext(ApplyWizardContext);
  if (!ctx) throw new Error("useApplyWizard must be used within ApplyWizardProvider");
  return ctx;
}

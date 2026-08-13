"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export const APPLY_STEP_PATHS = [
  "/membership/apply",
  "/membership/apply/rules-1",
  "/membership/apply/rules-2",
  "/membership/apply/rules-3",
  "/membership/apply/rules-4",
  "/membership/apply/documents",
  "/membership/apply/pending",
] as const;

export const APPLY_TOTAL_STEPS = APPLY_STEP_PATHS.length;

export type ApplicantType = "member" | "waitlist";

type ApplyWizardState = {
  // "member": renewing/current member. "waitlist": new applicant, who must
  // also prove a passed background check (or CCL) in addition to NRA proof.
  // NRA membership proof is required of every applicant regardless of type.
  applicantType: ApplicantType | "";
  name: string;
  email: string;
  phone: string;
  smsOptIn: boolean;
  address: string;
  nraNumber: string;
  nraExpirationDate: string;
  printedName: string;
  signature: string;
  agree: boolean;
  nraProofFile: File | null;
  backgroundCheckFile: File | null;
  discountCardFile: File | null;
  signed: boolean;
  applicationSubmitted: boolean;
};

type ApplyWizardContextValue = ApplyWizardState & {
  update: (patch: Partial<ApplyWizardState>) => void;
};

const initialState: ApplyWizardState = {
  // This wizard is new-applicant-only now -- renewing members use the
  // member portal (app/portal/(protected)) instead. Kept as a field (rather
  // than removed) since submit/documents still key required-doc logic off
  // it and the value is threaded straight through to the same
  // app/api/membership/submit endpoint the portal-adjacent legacy form uses.
  applicantType: "waitlist",
  name: "",
  email: "",
  phone: "",
  smsOptIn: false,
  address: "",
  nraNumber: "",
  nraExpirationDate: "",
  printedName: "",
  signature: "",
  agree: false,
  nraProofFile: null,
  backgroundCheckFile: null,
  discountCardFile: null,
  signed: false,
  applicationSubmitted: false,
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

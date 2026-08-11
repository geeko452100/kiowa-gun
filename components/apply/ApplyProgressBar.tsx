import { APPLY_TOTAL_STEPS } from "./ApplyWizardContext";

export default function ApplyProgressBar({ step, label }: { step: number; label: string }) {
  const pct = Math.round((step / APPLY_TOTAL_STEPS) * 100);
  return (
    <div className="apply-progress" role="group" aria-label="Application progress">
      <div className="apply-progress-track">
        <div className="apply-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="apply-progress-label">
        Step {step} of {APPLY_TOTAL_STEPS} &mdash; {label}
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApplyWizard } from "@/components/apply/ApplyWizardContext";
import ApplyProgressBar from "@/components/apply/ApplyProgressBar";

export default function ApplyInfoStep() {
  const router = useRouter();
  const { applicantType, name, email, phone, smsOptIn, address, update } = useApplyWizard();
  const [error, setError] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!applicantType) {
      setError("Please choose whether you're renewing your membership or applying for the waiting list.");
      return;
    }
    router.push("/membership/apply/rules-1");
  }

  return (
    <section className="apply-step">
      <ApplyProgressBar step={1} label="Your Info" />
      <h2>Your Info</h2>
      <p className="apply-step-intro">
        Let&apos;s start with your contact info. You&apos;ll read and sign the Range Rules next.
      </p>
      <form className="apply-form" onSubmit={onSubmit}>
        <fieldset className="apply-applicant-type">
          <legend>I&apos;m applying as a...</legend>
          <label className="apply-radio">
            <input
              type="radio"
              name="applicantType"
              checked={applicantType === "member"}
              onChange={() => update({ applicantType: "member" })}
            />
            Renewing / current member
          </label>
          <label className="apply-radio">
            <input
              type="radio"
              name="applicantType"
              checked={applicantType === "waitlist"}
              onChange={() => update({ applicantType: "waitlist" })}
            />
            New applicant for the waiting list
          </label>
        </fieldset>
        <label>
          Name
          <input value={name} onChange={(e) => update({ name: e.target.value })} required />
        </label>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => update({ email: e.target.value })}
            required
          />
        </label>
        <label>
          Phone
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => update({ phone: e.target.value.replace(/\D/g, "") })}
          />
        </label>
        <label className="apply-checkbox">
          <input
            type="checkbox"
            checked={smsOptIn}
            onChange={(e) => update({ smsOptIn: e.target.checked })}
          />
          Yes, text me about matches, events, and dues renewal reminders.
        </label>
        <p className="apply-step-note">
          Texting is optional and won&apos;t affect your membership or application. Message and
          data rates may apply; message frequency varies. Reply STOP to any text to stop, or
          change this anytime from your member portal. We don&apos;t sell or share your phone
          number.
        </p>
        <label>
          Home Address
          <input value={address} onChange={(e) => update({ address: e.target.value })} required />
        </label>
        {error && <p className="apply-error">{error}</p>}
        <div className="apply-step-nav">
          <span />
          <button type="submit">Continue</button>
        </div>
      </form>
    </section>
  );
}

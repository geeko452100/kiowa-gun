"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/components/admin/adminFetch";
import { useConfirm } from "@/components/admin/useConfirm";

const SIZES: { value: string; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable (recommended)" },
  { value: "large", label: "Large" },
];

// Single consolidated entry point for everything board members can change
// in the header -- logo image, banner image, and the club name/subtitle
// text -- instead of three separate always-visible control clusters
// crowding the small nav bar. Same button/panel look as EditableSection's
// "Edit this section" so every edit affordance on the site reads as one
// system.
export default function NavEditPanel({
  logoHasOverride,
  heroHasOverride,
  title,
  subtitle,
  size,
  contactPhone,
  contactAddress,
  socialFacebook,
  socialInstagram,
  socialYoutube,
}: {
  logoHasOverride: boolean;
  heroHasOverride: boolean;
  title: string;
  subtitle: string;
  size: string;
  contactPhone: string;
  contactAddress: string;
  socialFacebook: string;
  socialInstagram: string;
  socialYoutube: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const { confirm, dialog } = useConfirm();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);

  const [titleVal, setTitleVal] = useState(title);
  const [subtitleVal, setSubtitleVal] = useState(subtitle);
  const [sizeVal, setSizeVal] = useState(size);
  const [savingText, setSavingText] = useState(false);

  const [phoneVal, setPhoneVal] = useState(contactPhone);
  const [addressVal, setAddressVal] = useState(contactAddress);
  const [facebookVal, setFacebookVal] = useState(socialFacebook);
  const [instagramVal, setInstagramVal] = useState(socialInstagram);
  const [youtubeVal, setYoutubeVal] = useState(socialYoutube);
  const [savingContact, setSavingContact] = useState(false);

  async function uploadImage(key: "nav-logo" | "nav-hero", file: File) {
    const setUploading = key === "nav-logo" ? setUploadingLogo : setUploadingHero;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("image", file);
    const result = await adminFetch(`/api/admin/site-images/${key}`, { method: "PUT", body: formData });
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function resetImage(key: "nav-logo" | "nav-hero") {
    const ok = await confirm("Remove this uploaded picture and go back to the original?", "Yes, reset");
    if (!ok) return;
    setError("");
    const result = await adminFetch(`/api/admin/site-images/${key}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  // Both save buttons hit the same singleton settings row, so each sends the
  // full field set (not just the section it edits) or the other section's
  // values would get wiped out.
  function settingsPayload() {
    return {
      navTitle: titleVal,
      navSubtitle: subtitleVal,
      navTitleSize: sizeVal,
      contactPhone: phoneVal,
      contactAddress: addressVal,
      socialFacebook: facebookVal,
      socialInstagram: instagramVal,
      socialYoutube: youtubeVal,
    };
  }

  async function saveText() {
    setSavingText(true);
    setError("");
    const result = await adminFetch("/api/admin/site-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsPayload()),
    });
    setSavingText(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function saveContact() {
    setSavingContact(true);
    setError("");
    const result = await adminFetch("/api/admin/site-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsPayload()),
    });
    setSavingContact(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="editable-section-edit-btn mb-0" onClick={() => setOpen(true)}>
        ⇪ Edit nav
      </button>
    );
  }

  return (
    <div className="editable-section-editing flex flex-col gap-[24px]">
      {dialog}

      <div className="nav-edit-section">
        <strong>Club logo</strong>
        <div className="editable-image-controls">
          <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
            {uploadingLogo ? "Uploading…" : "Change logo"}
          </button>
          {logoHasOverride && (
            <button type="button" onClick={() => resetImage("nav-logo")} disabled={uploadingLogo}>
              Reset
            </button>
          )}
        </div>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void uploadImage("nav-logo", file);
          }}
        />
      </div>

      <div className="nav-edit-section">
        <strong>Header banner image</strong>
        <div className="editable-image-controls">
          <button type="button" onClick={() => heroInputRef.current?.click()} disabled={uploadingHero}>
            {uploadingHero ? "Uploading…" : "Change banner"}
          </button>
          {heroHasOverride && (
            <button type="button" onClick={() => resetImage("nav-hero")} disabled={uploadingHero}>
              Reset
            </button>
          )}
        </div>
        <input
          ref={heroInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void uploadImage("nav-hero", file);
          }}
        />
      </div>

      <div className="nav-edit-section">
        <strong>Club name &amp; subtitle</strong>
        <input
          className="editable-section-heading-input"
          value={titleVal}
          onChange={(e) => setTitleVal(e.target.value)}
          placeholder="Club name"
          aria-label="Club name"
        />
        <input
          className="editable-section-heading-input"
          value={subtitleVal}
          onChange={(e) => setSubtitleVal(e.target.value)}
          placeholder="Subtitle"
          aria-label="Subtitle"
        />
        <label className="flex flex-col gap-[4px] text-[0.9rem] font-semibold max-w-[260px]">
          Text size
          <select value={sizeVal} onChange={(e) => setSizeVal(e.target.value)}>
            {SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <div className="editable-section-actions">
          <button type="button" onClick={saveText} disabled={savingText}>
            {savingText ? "Saving…" : "Save text"}
          </button>
        </div>
      </div>

      <div className="nav-edit-section">
        <strong>Contact &amp; social (shown in the footer)</strong>
        <input
          className="editable-section-heading-input"
          value={phoneVal}
          onChange={(e) => setPhoneVal(e.target.value)}
          placeholder="Phone, e.g. (620) 555-1234"
          aria-label="Club phone number"
        />
        <input
          className="editable-section-heading-input"
          value={addressVal}
          onChange={(e) => setAddressVal(e.target.value)}
          placeholder="Address"
          aria-label="Club address"
        />
        <input
          className="editable-section-heading-input"
          value={facebookVal}
          onChange={(e) => setFacebookVal(e.target.value)}
          placeholder="Facebook URL"
          aria-label="Facebook URL"
        />
        <input
          className="editable-section-heading-input"
          value={instagramVal}
          onChange={(e) => setInstagramVal(e.target.value)}
          placeholder="Instagram URL"
          aria-label="Instagram URL"
        />
        <input
          className="editable-section-heading-input"
          value={youtubeVal}
          onChange={(e) => setYoutubeVal(e.target.value)}
          placeholder="YouTube URL"
          aria-label="YouTube URL"
        />
        <div className="editable-section-actions">
          <button type="button" onClick={saveContact} disabled={savingContact}>
            {savingContact ? "Saving…" : "Save contact info"}
          </button>
        </div>
      </div>

      <div className="editable-section-actions">
        <button type="button" className="editable-section-cancel" onClick={() => setOpen(false)}>
          Close
        </button>
        {error && <span className="editable-section-error">{error}</span>}
      </div>
    </div>
  );
}

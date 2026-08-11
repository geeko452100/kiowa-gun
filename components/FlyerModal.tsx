"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/components/admin/adminFetch";
import { useConfirm } from "@/components/admin/useConfirm";
import "@/app/styles/editable-image.css";

export default function FlyerModal({
  src,
  alt,
  imageKey,
  hasOverride = false,
  isAdmin = false,
}: {
  src: string;
  alt: string;
  imageKey?: string;
  hasOverride?: boolean;
  isAdmin?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !imageKey) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("image", file);
    const result = await adminFetch(`/api/admin/site-images/${imageKey}`, {
      method: "PUT",
      body: formData,
    });
    setUploading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function resetToDefault() {
    if (!imageKey) return;
    const ok = await confirm("Remove this uploaded flyer and go back to the original?", "Yes, reset");
    if (!ok) return;
    setError("");
    const result = await adminFetch(`/api/admin/site-images/${imageKey}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="editable-image-wrap flyer-wrap">
      {confirmDialog}
      <dialog ref={dialogRef} className="flyer-dialog">
        <button
          type="button"
          className="flyer-close"
          aria-label="Close enlarged flyer"
          onClick={() => dialogRef.current?.close()}
        >
          &times;
        </button>
        <img src={src} alt={alt} />
      </dialog>
      <button
        type="button"
        className="flyer-trigger"
        onClick={() => dialogRef.current?.showModal()}
      >
        <img src={src} alt={`${alt} — click to enlarge`} className="flyer-thumb" />
      </button>
      {isAdmin && imageKey && (
        <>
          <span className="editable-image-controls">
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "⇪ Change flyer"}
            </button>
            {hasOverride && (
              <button type="button" onClick={resetToDefault} disabled={uploading}>
                Reset
              </button>
            )}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            onChange={handleFile}
            style={{ display: "none" }}
          />
          {error && <span className="editable-image-error">{error}</span>}
        </>
      )}
    </div>
  );
}

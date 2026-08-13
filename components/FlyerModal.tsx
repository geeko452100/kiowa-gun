"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/components/admin/adminFetch";
import { useConfirm } from "@/components/admin/useConfirm";

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
    <div className="editable-image-wrap w-[280px] max-w-[40%] shrink-0 max-md:w-full max-md:max-w-full">
      {confirmDialog}
      <dialog
        ref={dialogRef}
        className="relative max-h-[95vh] max-w-[95vw] border-none bg-transparent p-0 text-text [&::backdrop]:bg-[rgba(0,0,0,0.85)]"
      >
        <button
          type="button"
          className="absolute top-[8px] right-[8px] h-[44px] w-[44px] cursor-pointer rounded-full border border-border bg-header-bg text-[1.2rem] leading-none text-white hover:bg-accent"
          aria-label="Close enlarged flyer"
          onClick={() => dialogRef.current?.close()}
        >
          &times;
        </button>
        <img src={src} alt={alt} className="block h-auto max-h-[95vh] w-auto max-w-[95vw]" />
      </dialog>
      <button
        type="button"
        className="block w-full cursor-pointer rounded-[6px] border border-border bg-transparent p-0 leading-[0]"
        onClick={() => dialogRef.current?.showModal()}
      >
        <img
          src={src}
          alt={`${alt} — click to enlarge`}
          className="block h-auto w-full max-w-[320px] rounded-[5px]"
        />
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

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/components/admin/adminFetch";
import { useConfirm } from "@/components/admin/useConfirm";
import "@/app/styles/editable-image.css";

// Wraps one of the site's handful of hard-coded images (nav logo/hero,
// range rules photo, matches flyer) so a board member can swap it for their
// own upload right where it appears -- deliberately just "replace the
// picture", no cropping, alt text, or URL fields.
export default function EditableImage({
  imageKey,
  src,
  hasOverride,
  alt,
  width,
  height,
  className,
  wrapClassName,
  isAdmin,
}: {
  imageKey: string;
  src: string;
  hasOverride: boolean;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  wrapClassName?: string;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const { confirm, dialog } = useConfirm();

  const img = <img src={src} alt={alt} width={width} height={height} className={className} />;

  if (!isAdmin) return img;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
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
    const ok = await confirm("Remove this uploaded picture and go back to the original?", "Yes, reset");
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
    <span className={`editable-image-wrap${wrapClassName ? ` ${wrapClassName}` : ""}`}>
      {dialog}
      {img}
      <span className="editable-image-controls">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : "⇪ Change image"}
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
    </span>
  );
}

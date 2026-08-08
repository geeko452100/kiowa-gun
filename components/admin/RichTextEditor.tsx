"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useLinkEditor } from "./useLinkEditor";

const TRACKED_COMMANDS = [
  "bold",
  "italic",
  "insertUnorderedList",
  "insertOrderedList",
] as const;
type TrackedCommand = (typeof TRACKED_COMMANDS)[number];

// A minimal WYSIWYG editor so board members never see or type HTML.
// Deliberately small: bold/italic/bullets/link cover everything the site's
// page text, news posts, and emails actually need.
export default function RichTextEditor({
  value,
  onChange,
  label,
  onImageUpload,
}: {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  onImageUpload?: (file: File) => Promise<string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [activeFormats, setActiveFormats] = useState<
    Record<TrackedCommand, boolean>
  >({
    bold: false,
    italic: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });

  useEffect(() => {
    if (ref.current && !initialized.current) {
      ref.current.innerHTML = value || "";
      initialized.current = true;
    }
  }, [value]);

  // Reflects every format active at the caret at once (e.g. bold + italic +
  // list together), so combining formats is visible without needing to
  // fall back to keyboard shortcuts to tell whether a click "stuck".
  const updateActiveFormats = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !ref.current || !sel.anchorNode) return;
    if (!ref.current.contains(sel.anchorNode)) return;
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList"),
    });
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveFormats);
    return () =>
      document.removeEventListener("selectionchange", updateActiveFormats);
  }, [updateActiveFormats]);

  function handleInput() {
    if (ref.current) {
      onChange(ref.current.innerHTML);
    }
  }

  const { startLink, startButton, dialog } = useLinkEditor(ref, handleInput);

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    handleInput();
    updateActiveFormats();
  }

  // The native file picker steals focus from the editable div, so the
  // caret's range is saved before it opens and restored once the upload
  // finishes, letting the image land back where the cursor was.
  const savedRangeRef = useRef<Range | null>(null);

  function openImagePicker() {
    const container = ref.current;
    const range = rangeInContainer(container);
    savedRangeRef.current = range ? range.cloneRange() : null;
    fileInputRef.current?.click();
  }

  function rangeInContainer(container: HTMLDivElement | null): Range | null {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !container) return null;
    const range = sel.getRangeAt(0);
    if (!container.contains(range.commonAncestorContainer)) return null;
    return range;
  }

  async function handleImageSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onImageUpload) return;
    setImageError("");
    setUploadingImage(true);
    try {
      const url = await onImageUpload(file);
      ref.current?.focus();
      const sel = window.getSelection();
      if (sel && savedRangeRef.current) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
      document.execCommand("insertImage", false, url);
      handleInput();
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
    }
  }

  return (
    <div className="rte">
      {dialog}
      {label && <span className="rte-label">{label}</span>}
      <div className="rte-toolbar">
        <button
          type="button"
          className={activeFormats.bold ? "active" : undefined}
          aria-pressed={activeFormats.bold}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("bold")}
          title="Bold"
        >
          <b>B</b>
        </button>
        <button
          type="button"
          className={activeFormats.italic ? "active" : undefined}
          aria-pressed={activeFormats.italic}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("italic")}
          title="Italic"
        >
          <i>I</i>
        </button>
        <button
          type="button"
          className={activeFormats.insertUnorderedList ? "active" : undefined}
          aria-pressed={activeFormats.insertUnorderedList}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertUnorderedList")}
          title="Bulleted list"
        >
          • List
        </button>

        <button
          type="button"
          className={activeFormats.insertOrderedList ? "active" : undefined}
          aria-pressed={activeFormats.insertOrderedList}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertOrderedList")}
          title="Numbered list"
        >
          1. List
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={startLink}
          title="Add link"
        >
          Link
        </button>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={startButton}
          title="Add button"
        >
          Button
        </button>

        {onImageUpload && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openImagePicker}
            disabled={uploadingImage}
            title="Insert image"
          >
            {uploadingImage ? "Uploading…" : "Image"}
          </button>
        )}
      </div>
      {onImageUpload && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={handleImageSelected}
          style={{ display: "none" }}
        />
      )}
      {imageError && <p className="admin-error">{imageError}</p>}
      <div
        ref={ref}
        className="rte-content"
        contentEditable
        onInput={handleInput}
        onFocus={updateActiveFormats}
        onKeyUp={updateActiveFormats}
        onMouseUp={updateActiveFormats}
        onBlur={() =>
          setActiveFormats({
            bold: false,
            italic: false,
            insertUnorderedList: false,
            insertOrderedList: false,
          })
        }
        suppressContentEditableWarning
      />
    </div>
  );
}

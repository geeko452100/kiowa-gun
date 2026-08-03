"use client";

import { useEffect, useRef } from "react";

// A minimal WYSIWYG editor so board members never see or type HTML.
// Deliberately small: bold/italic/bullets/link cover everything the site's
// page text, news posts, and emails actually need.
export default function RichTextEditor({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (html: string) => void;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (ref.current && !initialized.current) {
      ref.current.innerHTML = value || "";
      initialized.current = true;
    }
  }, [value]);

  function handleInput() {
    if (ref.current) onChange(ref.current.innerHTML);
  }

  function exec(command: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    handleInput();
  }

  function addLink() {
    const selection = window.getSelection()?.toString();
    const url = window.prompt(
      selection ? `Link "${selection}" to what web address?` : "What web address should this link go to?",
      "https://"
    );
    if (url) exec("createLink", url);
  }

  return (
    <div className="rte">
      {label && <span className="rte-label">{label}</span>}
      <div className="rte-toolbar">
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} title="Bold">
          <b>B</b>
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} title="Italic">
          <i>I</i>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("insertUnorderedList")}
          title="Bulleted list"
        >
          • List
        </button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={addLink} title="Add link">
          Link
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => exec("unlink")}
          title="Remove link"
        >
          Remove link
        </button>
      </div>
      <div ref={ref} className="rte-content" contentEditable onInput={handleInput} suppressContentEditableWarning />
    </div>
  );
}

"use client";

import { useRef } from "react";

export default function FlyerModal({ src, alt }: { src: string; alt: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
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
    </>
  );
}

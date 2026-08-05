"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

type PopoverState =
  | { mode: "hover"; link: HTMLAnchorElement }
  | { mode: "edit-url"; link: HTMLAnchorElement; isNew: boolean }
  | null;

const ZWSP = "​";

function cleanText(link: HTMLAnchorElement) {
  return (link.textContent ?? "").split(ZWSP).join("");
}

function rangeInContainer(container: HTMLElement): Range | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  if (!container.contains(range.commonAncestorContainer)) return null;
  return range;
}

// Links are edited in place instead of through a popup: clicking "Link"
// drops an editable <a> right where the cursor is (or wraps the selection)
// and floats a small URL field beside it. Existing links show their URL on
// hover, with a caret to reopen that same field for edits.
export function useLinkEditor(
  contentRef: RefObject<HTMLDivElement | null>,
  notifyChange: () => void,
) {
  const [popover, setPopover] = useState<PopoverState>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [popoverWidth, setPopoverWidth] = useState(220);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const reposition = useCallback(
    (link: HTMLAnchorElement) => {
      setRect(link.getBoundingClientRect());
      const containerWidth =
        contentRef.current?.getBoundingClientRect().width ?? 320;
      setPopoverWidth(Math.min(420, Math.max(220, containerWidth * 0.4)));
    },
    [contentRef],
  );

  const finishEdit = useCallback(
    (commit: boolean) => {
      setPopover((current) => {
        if (!current || current.mode !== "edit-url") return current;
        const { link, isNew } = current;
        if (commit) {
          const url = draftUrl.trim();
          const text = cleanText(link);
          if (!text && !url) {
            link.remove();
          } else {
            link.textContent = text || url;
            if (url) link.setAttribute("href", url);
            else link.removeAttribute("href");
          }
        } else if (isNew && !cleanText(link)) {
          link.remove();
        }
        notifyChange();
        return null;
      });
      setDraftUrl("");
    },
    [draftUrl, notifyChange],
  );

  // Start a new link: wrap the current selection, or drop an empty one at
  // the caret so its text can be typed directly into the document.
  const startLink = useCallback(() => {
    const container = contentRef.current;
    if (!container) return;
    const range = rangeInContainer(container);
    if (!range) return;
    container.focus();

    const link = document.createElement("a");
    let autofocusUrl = false;

    if (range.collapsed) {
      const zwsp = document.createTextNode(ZWSP);
      link.appendChild(zwsp);
      range.deleteContents();
      range.insertNode(link);
      const caret = document.createRange();
      caret.setStart(zwsp, 1);
      caret.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(caret);
    } else {
      link.appendChild(range.extractContents());
      range.insertNode(link);
      const after = document.createRange();
      after.selectNodeContents(link);
      after.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(after);
      autofocusUrl = true;
    }

    setDraftUrl("");
    setPopover({ mode: "edit-url", link, isNew: true });
    reposition(link);
    if (autofocusUrl) {
      requestAnimationFrame(() => urlInputRef.current?.focus());
    }
  }, [contentRef, reposition]);

  const switchToEditUrl = useCallback(
    (link: HTMLAnchorElement) => {
      setDraftUrl(link.getAttribute("href") ?? "");
      setPopover({ mode: "edit-url", link, isNew: false });
      reposition(link);
      requestAnimationFrame(() => {
        urlInputRef.current?.focus();
        urlInputRef.current?.select();
      });
    },
    [reposition],
  );

  // Hover preview: show a link's destination without leaving the document.
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    function cancelHoverClose() {
      if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
    }
    function scheduleHoverClose() {
      cancelHoverClose();
      hoverCloseTimer.current = setTimeout(() => {
        setPopover((current) => (current?.mode === "hover" ? null : current));
      }, 200);
    }

    function onMouseOver(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest?.(
        "a",
      ) as HTMLAnchorElement | null;
      if (!target) return;
      cancelHoverClose();
      setPopover((current) => {
        if (current && current.mode === "edit-url") return current;
        reposition(target);
        return { mode: "hover", link: target };
      });
    }

    function onMouseOut(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest?.(
        "a",
      ) as HTMLAnchorElement | null;
      if (!target) return;
      scheduleHoverClose();
    }

    container.addEventListener("mouseover", onMouseOver);
    container.addEventListener("mouseout", onMouseOut);
    return () => {
      container.removeEventListener("mouseover", onMouseOver);
      container.removeEventListener("mouseout", onMouseOut);
      cancelHoverClose();
    };
  }, [contentRef, reposition]);

  // Keep the popover glued to its link, including while typing grows it.
  // (Its initial position is set by whichever handler opened the popover.)
  useEffect(() => {
    if (!popover) return;
    const onReposition = () => reposition(popover.link);
    window.addEventListener("scroll", onReposition, true);
    window.addEventListener("resize", onReposition);
    const container = contentRef.current;
    if (popover.mode === "edit-url") {
      container?.addEventListener("input", onReposition);
    }
    return () => {
      window.removeEventListener("scroll", onReposition, true);
      window.removeEventListener("resize", onReposition);
      container?.removeEventListener("input", onReposition);
    };
  }, [popover, reposition, contentRef]);

  // Clicking or pressing Escape outside the field commits/cancels the edit.
  useEffect(() => {
    if (!popover || popover.mode !== "edit-url") return;
    const link = popover.link;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (link.contains(target)) return;
      finishEdit(true);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        finishEdit(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [popover, finishEdit]);

  function cancelHoverCloseOnPopover() {
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current);
  }
  function scheduleHoverCloseOnPopover() {
    if (popover?.mode !== "hover") return;
    hoverCloseTimer.current = setTimeout(() => {
      setPopover((current) => (current?.mode === "hover" ? null : current));
    }, 200);
  }

  const dialog =
    popover && rect
      ? createPortal(
          <div
            ref={popoverRef}
            className="link-popover"
            style={{
              top: rect.bottom + window.scrollY + 6,
              left: rect.left + window.scrollX,
              width: popoverWidth,
            }}
            onMouseEnter={cancelHoverCloseOnPopover}
            onMouseLeave={scheduleHoverCloseOnPopover}
          >
            {popover.mode === "hover" ? (
              <div className="link-popover-preview">
                <span
                  className="link-popover-url"
                  title={popover.link.getAttribute("href") ?? ""}
                >
                  {popover.link.getAttribute("href") || "No URL set"}
                </span>
                <button
                  type="button"
                  className="link-popover-caret"
                  onClick={() => switchToEditUrl(popover.link)}
                  title="Edit URL"
                  aria-label="Edit URL"
                >
                  &#9662;
                </button>
              </div>
            ) : (
              <div className="link-popover-edit">
                <label>
                  {popover.isNew ? "Web address" : "Update web address"}
                  <input
                    ref={urlInputRef}
                    type="url"
                    value={draftUrl}
                    placeholder="https://"
                    onChange={(e) => setDraftUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        finishEdit(true);
                      }
                    }}
                  />
                </label>
                {popover.isNew && (
                  <p className="link-popover-hint">
                    Type the link text in the document, then add its URL
                    here.
                  </p>
                )}
              </div>
            )}
          </div>,
          document.body,
        )
      : null;

  return { startLink, dialog };
}

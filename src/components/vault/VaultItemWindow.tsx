"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { driveImage } from "@/lib/driveImage";

/**
 * ONE TILE, OPENED.
 *
 * Serves both vault sets, because they want the same window with different
 * contents: a visual prints its prompt and offers to copy it, a tool prints its
 * note and offers to open itself. Two components would have been two copies of
 * the same scrim, the same escape handling and the same media element.
 *
 * DELIBERATELY NOT A PORTAL, AND IT DOES NOT LOCK THE DOCUMENT.
 * It is rendered inside the gallery and positioned fixed. VaultWindow, its
 * ancestor, is already a fixed overlay running its own nested Lenis, and
 * already sets html.vault-window-open. A second scroll lock on top of that one
 * would have to be unwound in the right order to avoid leaving the page frozen,
 * which is exactly the class of bug that cost an evening on /admin. The panel
 * carries data-lenis-prevent so its own overflow scrolls without driving the
 * scroller underneath.
 *
 * IT OUTLIVES ITS OWN PROP, BRIEFLY.
 * `item` going null is a REQUEST to close, not the close itself. The window
 * keeps drawing the last item it was given while the exit animation runs, then
 * drops it. Without that the element unmounted on the same frame as the click
 * and the open animation was the only one anybody ever saw - the window simply
 * vanished. Opening and closing now cost the same gesture in reverse.
 */
export type VaultTile = {
  id: string;
  kind: "visual" | "tool";
  title: string;
  caption: string;
  /** What the grid draws. */
  thumb: string;
  /** What this window draws, and what the link points at. */
  full: string;
  mediaType: "image" | "video";
  poster: string;
  /** Visuals only. The copyable payload. */
  prompt: string;
  /** Category id for a visual, free text for a tool. */
  category: string;
  /** Tools only. The only prose the window prints. */
  note: string;
  toolUrl: string | null;
};

/** Must match the exit animation in vault-gallery.css. A number in two places
 *  is a liability, but the alternative - reading it back off the element with
 *  getComputedStyle - is worse for one constant that changes once a year. */
const EXIT_MS = 260;

export const VaultItemWindow: React.FC<{
  item: VaultTile | null;
  /** Resolved label for the item's category, when there is one. */
  categoryLabel?: string;
  onClose: () => void;
}> = ({ item, categoryLabel, onClose }) => {
  const [copied, setCopied] = useState(false);
  /* What is actually on screen. Trails `item` by one exit animation. */
  const [shown, setShown] = useState<VaultTile | null>(item);
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | null>(null);

  /* A fresh item has not been copied yet. */
  useEffect(() => {
    setCopied(false);
  }, [item]);

  useEffect(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }

    /* Opening, or swapping straight from one tile to another. */
    if (item) {
      setShown(item);
      setClosing(false);
      return;
    }

    /* Already gone. Nothing to animate out. */
    if (!shown) return;

    setClosing(true);
    timer.current = window.setTimeout(() => {
      setShown(null);
      setClosing(false);
      timer.current = null;
    }, EXIT_MS);

    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    };
    /* `shown` is read but deliberately not a dependency: reacting to it would
       restart this effect mid-exit and strand the window half-faded. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  useEffect(() => {
    if (!item) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      /* Stopped so the vault window behind does not ALSO take the escape and
         close itself. One press, one dismissal, innermost first. */
      event.stopPropagation();
      onClose();
    };

    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [item, onClose]);

  /* Ignored once the exit has started, so a second click during the fade does
     not queue a close against an already-closing window. */
  const requestClose = useCallback(() => {
    if (closing) return;
    onClose();
  }, [closing, onClose]);

  if (!shown) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shown.prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* Clipboard refused - insecure origin, or permission denied. The text is
         on screen and selectable, so this is a downgrade, not a dead end. */
    }
  };

  const label = categoryLabel || shown.category;

  return (
    <div
      className="vault-detail"
      role="dialog"
      aria-modal="true"
      aria-label={shown.title}
      data-closing={closing ? "true" : "false"}
      onClick={requestClose}
    >
      <div
        className="vault-detail__panel"
        data-lenis-prevent
        /* The backdrop closes; the panel must not. */
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="vault-detail__close"
          onClick={requestClose}
        >
          Close
        </button>

        <div className="vault-detail__media">
          {shown.mediaType === "video" ? (
            <video
              src={driveImage(shown.full)}
              poster={driveImage(shown.poster)}
              controls
              autoPlay
              muted
              loop
              playsInline
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              referrerPolicy="no-referrer"
              src={driveImage(shown.full)}
              alt={shown.title}
              draggable={false}
            />
          )}
        </div>

        <div className="vault-detail__body">
          {label ? <p className="vault-detail__eyebrow">{label}</p> : null}
          <h3 className="vault-detail__title">{shown.title}</h3>
          {shown.caption ? (
            <p className="vault-detail__caption">{shown.caption}</p>
          ) : null}

          {shown.kind === "visual" ? (
            shown.prompt ? (
              <>
                <p className="vault-detail__label">Prompt</p>
                {/* Its own scroller, and its own Lenis exemption. A long prompt
                    used to push the copy button past the fold and force the
                    whole panel to scroll to reach it; now the prose moves and
                    the button stays put. */}
                <p className="vault-detail__prompt" data-lenis-prevent>
                  {shown.prompt}
                </p>
                <button
                  type="button"
                  className="vault-detail__btn"
                  onClick={() => void copy()}
                >
                  {copied ? "Copied" : "Copy prompt"}
                </button>
              </>
            ) : (
              <p className="vault-detail__empty">
                No prompt saved for this one yet.
              </p>
            )
          ) : (
            <>
              {shown.note ? (
                <p className="vault-detail__prompt" data-lenis-prevent>
                  {shown.note}
                </p>
              ) : null}
              {shown.toolUrl ? (
                <a
                  className="vault-detail__btn"
                  href={shown.toolUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open the tool
                </a>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VaultItemWindow;

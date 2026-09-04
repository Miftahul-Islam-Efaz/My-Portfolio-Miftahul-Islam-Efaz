import type { VaultFolderFlight } from './types';

/* ------------------------------------------------------------------
   THE VAULT TEASER - content

   Assets and copy for the landing-page section. Separated from the
   component so the imagery and wording can change without touching
   markup, and from config/vault.ts because these are content decisions
   rather than motion tuning.
   ------------------------------------------------------------------ */

/** THE HAND, RESTING. Transparent PNG: hand holding the open folder
 *  with "click me" embossed into the cover.
 *
 *  Served through /api/drive-image - see lib/driveImage.ts. Do not point
 *  an <img> straight at lh3: it returns HTTP 429 under the parallel
 *  requests this section makes, and unsuffixed it ships a 1.25 MB PNG.
 *
 *  The Drive file must stay shared as "anyone with the link". */
export const VAULT_HAND_IMAGE =
	'https://lh3.googleusercontent.com/d/1YqrfoXSrxiSJo5RRepkZYEeE9PZVRECT';

/** THE HAND, PRESSED. Identical framing, but "click me" is lit from
 *  within.
 *
 *  Two frames rather than a code-driven effect because the label is part
 *  of the photograph - there is no text node to glow. VaultTeaser stacks
 *  them and crossfades on :active.
 *
 *  These two files MUST stay pixel-aligned. If this one is ever
 *  re-exported at a different crop the label will visibly jump on
 *  press, and nothing in the build will catch it. */
export const VAULT_HAND_IMAGE_ACTIVE =
	'https://lh3.googleusercontent.com/d/1BiuKOSQXddhmJFhLtUjy24G_6EIeCeYF';

/** THE ESCAPING FOLDER. 1:1 transparent PNG, drawn five times. */
export const VAULT_FOLDER_IMAGE =
	'https://lh3.googleusercontent.com/d/1f0tus00Zk3OXuUZEnZvOh847Pppqderk';

/** THE FLIGHT PATHS. One entry per escaping folder - add or remove a
 *  folder by editing this array; the component maps over it and the hook
 *  reads it by index, so neither needs touching.
 *
 *  Units, all resolved against STAGE WIDTH so the cluster keeps its
 *  shape at any viewport:
 *    dx, dy  destination offset from the folder mouth. dy negative = up.
 *    arc     how far the path bows above the straight line on the way.
 *    scale   final size multiplier. They emerge at 0.3 and grow.
 *    spin    degrees turned over the flight.
 *    tilt    starting rotation, so they do not all leave square.
 *    delay   fraction of the emission window before this one starts.
 *    fade    opacity on arrival. The far ones thin out.
 *
 *  ---------------------------------------------------------------
 *  FIVE FOLDERS, HELD CLOSE. Down from seven: past five the cluster
 *  stopped reading as "a few things escaping" and started reading as a
 *  pattern, which is the moment the gesture turns into a graphic.
 *
 *  The travel distances have now been tightened four times - the last
 *  entry's dx went 0.47 -> 0.215 -> 0.17 -> 0.108. The lesson each time
 *  was the same: these belong in the lit pocket immediately around the
 *  opening, because a folder out in the dark has visibly left the
 *  folder rather than being in the act of leaving it.
 *
 *  IF MORE MOVEMENT IS EVER WANTED, RAISE `arc` BEFORE `dx`. Arc buys
 *  energy without buying distance, which is the thing that keeps
 *  breaking this.
 *  --------------------------------------------------------------- */
export const VAULT_FOLDER_FLIGHT: VaultFolderFlight[] = [];
/* Small folders intentionally removed: the archive glow and the
   sand alone carry the escape now. Re-add entries above to bring them back. */

/** The line under the folder. The only instruction on the section now
 *  that the eyebrow is gone - so it carries the whole promise. */
export const VAULT_CUE = 'Visuals and tools made by me. Take them.';

/** Accessible name for the link.
 *
 *  Load-bearing, not a nicety: "click me" is embossed into the
 *  photograph, so a screen reader gets NOTHING from this control
 *  without it. */
export const VAULT_ARIA_LABEL =
	'Open the Vault: AI-generated visuals and tools';

/** Visually hidden heading, so the section has a real place in the
 *  document outline. Its meaning is otherwise carried entirely by two
 *  photographs. */
export const VAULT_FALLBACK_HEADING = 'The Vault';

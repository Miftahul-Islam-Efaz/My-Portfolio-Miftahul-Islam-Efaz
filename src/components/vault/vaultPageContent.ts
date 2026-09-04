/* ------------------------------------------------------------------
   THE VAULT - content

   Copy and assets for the Vault itself, shared by both presentations:
   the window (app/@modal/(.)vault) and the standalone document
   (app/vault). Both must say exactly the same thing - if this ever gets
   duplicated into the two routes they will drift, and the difference
   will only show up to someone who deep-links.
   ------------------------------------------------------------------ */

/** THE HERO PHOTOGRAPH. A figure from behind inside a storm of
 *  motion-blurred light-streak debris, converging on them.
 *
 *  Served through /api/drive-image like every other Drive asset - see
 *  lib/driveImage.ts for why going straight to lh3 fails (HTTP 429 on
 *  parallel requests, and a multi-megabyte original).
 *
 *  The Drive file must stay shared as "anyone with the link". */
export const VAULT_HERO_IMAGE =
	'https://lh3.googleusercontent.com/d/1fa0ohY-XC1SqoZppHYqJtYJtekn6A3eQ';

/** The title, set over the photograph in thin, very wide-tracked caps.
 *
 *  Split per glyph by the window so each letter can rise on its own
 *  delay - so this is a string, not markup, and the space matters: it
 *  is rendered as a real gap in the stagger rather than skipped. */
export const VAULT_HERO_TITLE = 'THE VAULT';

/** Small line above the title. The title is two words of pure
 *  atmosphere, so this is the one place that says what the room
 *  actually contains. */
export const VAULT_HERO_EYEBROW = 'Assets and tools';

/** Accessible label for the close control. "Close" alone is ambiguous
 *  when the thing being closed is a full-screen window that looks like
 *  a page. */
export const VAULT_CLOSE_LABEL = 'Close the Vault and return';

/** THE SECTIONS OF THE VAULT, in order.
 *
 *  Currently one: the GALLERY - AI-generated visuals, usable as design
 *  assets. It renders BARE, with no index, title or blurb; the pill
 *  toggle under the field is the only chrome it needs, and the hero
 *  above has already said what the room is.
 *
 *  ---------------------------------------------------------------
 *  THE LIBRARY SECTION WAS REMOVED FROM HERE, AND ON PURPOSE.
 *
 *  It was a heading and a sentence of intent with nothing under it -
 *  which was defensible while the gallery was also just a heading, and
 *  stopped being defensible the moment the gallery became a real
 *  field. An empty titled section directly below a full one does not
 *  read as "more to come", it reads as the page having failed to
 *  load.
 *
 *  It comes back by adding its entry to this array and nothing else:
 *  the window still renders index + title + blurb for any section that
 *  is not the gallery, so the markup for it is intact and waiting. The
 *  copy it had was:
 *
 *    { id: 'library', index: '02', title: 'Library', blurb:
 *      'Tools and apps I built because I needed them, and kept
 *       because they held up.' }
 *  --------------------------------------------------------------- */
export const VAULT_SECTIONS = [
	{
		id: 'gallery',
		index: '01',
		title: 'Gallery',
		blurb:
			'AI-generated visuals, made as assets rather than as experiments. Take what is useful.',
	},
] as const;

export type VaultSectionId = (typeof VAULT_SECTIONS)[number]['id'];

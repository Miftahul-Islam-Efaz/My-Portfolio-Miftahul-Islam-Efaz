/* ------------------------------------------------------------------
   THE VAULT GALLERY - content

   The cards themselves. Separated from config/vaultGallery.ts for the
   same reason vaultContent.ts is separated from config/vault.ts: these
   are content decisions, and they change on a completely different
   schedule from the motion tuning.

   ---------------------------------------------------------------
   THE IMAGES ARE DEMO IMAGES, FROM PICSUM.

   https://picsum.photos serves deterministic photos per seed - free,
   no key, no CORS problem - so the field renders, staggers and shears
   with real, varied image weight rather than with grey boxes or three
   recycled placeholders. That variety is the only way the layout can
   actually be judged.

   To go from demo to production, swap each card's `seed` for the
   exported visual and repoint the helpers at Drive (see below). The
   component maps this array and the stylesheet reads its column
   patterns by position, so nothing else needs touching.

   TITLES ARE PLACEHOLDER COPY TOO. Two lines each, matching the
   reference's caption block.
   ---------------------------------------------------------------

   ON THE TWO SIZES. The thumb is 900x1200 and the original 1920x2560.
   The card shows the small one; the large is only ever fetched when
   someone opens one - which is the point of a vault you can take
   things from. When these become Drive assets, keep the same
   discipline: `=w900-rj` on the thumb, no suffix on the original, or
   the field ships multi-megabyte originals behind the hero - see the
   note in lib/driveImage.ts.

   Everything goes through driveImage() at the point of use. Picsum
   URLs are not lh3 links, so they pass straight through - safe per
   that function's own contract.
   ------------------------------------------------------------------ */

/** Which half of the vault a card belongs to. The pill toggle under the
 *  field switches between these two. This is the GALLERY's own filter -
 *  not the same thing as the Library section below it, which keeps its
 *  heading and its own content. */
export type VaultGalleryTab = 'visuals' | 'tools';

export type VaultGalleryItem = {
	id: string;
	/** Which set this card appears in. */
	tab: VaultGalleryTab;
	/** Caption line one - the name. */
	title: string;
	/** Caption line two. Its own field rather than a line break inside
	 *  `title` so it can be dropped without leaving a stray newline in
	 *  the markup. */
	caption: string;
	/** Picsum seed. Deterministic: the same seed always returns the same
	 *  photograph, so the field does not reshuffle on every reload. */
	seed: string;
};

const PICSUM = 'https://picsum.photos/seed/';

/** Thumbnail URL for a card. 3:4, matching the card's aspect ratio
 *  exactly so object-fit never has to crop the demo images.
 *
 *  Built with plain concatenation rather than a template literal - a
 *  brace got pasted into this URL once and a literal 'https://...'
 *  is a broken link that compiles cleanly, which is the worst kind. */
export const galleryThumb = (item: VaultGalleryItem): string =>
	PICSUM + item.seed + '/900/1200';

/** The original file, for the download. Larger, fetched only when the
 *  card is opened. */
export const galleryOriginal = (item: VaultGalleryItem): string =>
	PICSUM + item.seed + '/1920/2560';

/** THE FIELD, IN ORDER.
 *
 *  Order matters more than it looks: the column stagger and the drift
 *  direction are applied by POSITION, so moving a card moves it to a
 *  different resting height and a different travel direction along the
 *  diagonal. That is exactly why those patterns live in config and not
 *  on the items - a card should not carry its own coordinates in a
 *  field that is meant to reflow. */
export const VAULT_GALLERY_ITEMS: readonly VaultGalleryItem[] = [
	{
		id: 'wired-slicing',
		tab: 'visuals',
		title: 'Wired & Slicing',
		caption: 'Design collections',
		seed: 'vault-wired',
	},
	{
		id: 'beyond-form',
		tab: 'visuals',
		title: 'Beyond Form',
		caption: 'Creative objects',
		seed: 'vault-beyond',
	},
	{
		id: 'hypernova',
		tab: 'visuals',
		title: 'Hypernova',
		caption: 'Abstract forms',
		seed: 'vault-hypernova',
	},
	{
		id: 'soft-matter',
		tab: 'visuals',
		title: 'Soft Matter',
		caption: 'Studies in light',
		seed: 'vault-matter',
	},
	{
		id: 'grain-index',
		tab: 'visuals',
		title: 'Grain Index',
		caption: 'Textures and plates',
		seed: 'vault-grain',
	},
	{
		id: 'long-exposure',
		tab: 'visuals',
		title: 'Long Exposure',
		caption: 'Motion debris',
		seed: 'vault-exposure',
	},
	{
		id: 'type-archive',
		tab: 'tools',
		title: 'Type Archive',
		caption: 'Specimen tool',
		seed: 'vault-type',
	},
	{
		id: 'gdrive-host',
		tab: 'tools',
		title: 'GDrive Host',
		caption: 'Media CDN',
		seed: 'vault-host',
	},
	{
		id: 'palette-probe',
		tab: 'tools',
		title: 'Palette Probe',
		caption: 'Colour extraction',
		seed: 'vault-palette',
	},
] as const;

/** The switch under the field. Lowercase, per the reference - the rest
 *  of the window is set in wide caps, and a lowercase control is what
 *  keeps it reading as a control rather than as another label. */
export const VAULT_GALLERY_TABS: readonly {
	id: VaultGalleryTab;
	label: string;
}[] = [
	{ id: 'visuals', label: 'visuals' },
	{ id: 'tools', label: 'tools' },
] as const;

/** Accessible name for the toggle group. The two pills read "visuals"
 *  and "tools" with no visible heading anywhere near them, so without
 *  this they are two unlabelled buttons to a screen reader. */
export const VAULT_GALLERY_TOGGLE_LABEL = 'Filter the Vault';

/** Screen-reader heading for the section. The field renders bare by
 *  design - no index, no title, no blurb - but a section with no
 *  accessible name is a navigation dead end. */
export const VAULT_GALLERY_SR_TITLE = 'Gallery';

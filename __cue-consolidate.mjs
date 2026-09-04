import { readFileSync, writeFileSync } from 'node:fs';

const CSS = 'src/styles/work-gallery.css';
const DC = 'src/components/work/DitherCarousel.tsx';
let applied = 0;

function editFile(file, tag, find, replace) {
	const src = readFileSync(file, 'utf8');
	const hits = src.split(find).length - 1;
	if (hits !== 1) {
		console.error('FAIL ' + tag + ': matched ' + hits + ' times');
		process.exit(1);
	}
	writeFileSync(file, src.replace(find, replace), 'utf8');
	console.log('ok: ' + tag);
	applied++;
}

/* ---------- 1. THE BUG: the cue could never come back ---------- */

editFile(
	DC,
	'cue-survives-gallery',
	`    setGalleryClosing(false);
    setGalleryOpen(true);
    /* The offer has been taken; the cue has nothing left to say. */
    setCueVisible(false);
    wheelAccum.current = 0;
  }, []);`,
	`    setGalleryClosing(false);
    setGalleryOpen(true);
    /* DO NOT CLEAR cueVisible HERE. It was cleared when the cue was a
       one-shot offer that had now been taken. It is a permanent fixture,
       and the only thing that sets it true again is the IntersectionObserver
       - which fires on intersection changes, and opening an overlay is not
       one. So clearing it here retired the cue for good: enter the gallery
       once and it never returned.

       The render already hides it while either overlay is up, which is the
       correct place for that concern - it is a question about what is on top
       of the cue, not about whether the section wants one. */
  }, []);`
);

/* ---------- 2. THE STYLES: six stacked passes into one ---------- */

/* The silhouette: one and a half S - crest, trough, half rise. */
const SHAPE = 'M0,150 L0,58 C24,30 58,36 80,66 C100,92 118,94 140,88 C164,82 184,116 200,150 Z';
const SMALL = 'M0,111 L0,43 C18,22 43,27 59,49 C74,68 87,70 104,65 C121,61 136,86 148,111 Z';

const block = [
'/* ==================================================================',
'   THE VIEW MORE CUE',
'',
'   A soft blob welded into the bottom-left corner of the viewport, and',
'   a permanent fixture of the work section rather than a reward for',
'   reaching the end of it.',
'',
'   IT USED TO BE A PILL IN THE MIDDLE OF THE FRAME. That put a large',
'   plate over the work the visitor was still looking at, and however',
'   carefully it was staged it read as a popup. The corner is where a',
'   persistent offer belongs: visible, ignorable, never over the content.',
'',
'   FOUR RULES HOLD THIS TOGETHER. They were each arrived at by breaking',
'   them, so they are worth stating plainly:',
'',
'   1. THE SILHOUETTE NEVER CHANGES. It is one clip-path, in every state.',
'      Hover swapping in a second path, or a keyframe morphing between',
'      two, makes the blob visibly change formation under the pointer and',
'      appear to jump - a different path puts its mass somewhere else.',
'      border-radius cannot draw this shape at all: it gives exactly one',
'      curve per corner, so the most it can produce is an egg.',
'',
'   2. THE CONTAINER NEVER MOVES. It is flush in the corner, so any',
'      translate on it opens a gap along the screen edge and the blob',
'      looks like it came unstuck. A body stuck to a surface does not',
'      travel when shoved, it deforms.',
'',
'   3. DEFORMATION IS ANCHORED AT THE CORNER. transform-origin is the',
'      stuck corner, so the welded mass stays put and only the free edge',
'      travels. With the default centre origin the whole blob slides off',
'      the corner as it scales.',
'',
'   4. transform IS OWNED BY THE SPRING, exclusively. ViewMoreCue.tsx',
'      rewrites it every frame from a filtered, sprung scroll velocity.',
'      Nothing else may set it on the visible pill, and it must stay out',
'      of the transition list - a transition on a per-frame value makes',
'      the spring chase a moving target and arrive visibly late.',
'',
'   The arrival is therefore on the CONTAINER, not the pill: the two are',
'   nested, so a reveal on the outer box and a stretch on the inner one',
'   compose instead of overwriting each other.',
'   ================================================================== */',
'',
'.workcue {',
'	position: fixed;',
'	inset-inline-start: 0;',
'	inset-block-end: 0;',
'	z-index: 45;',
'',
'	width: 200px;',
'	height: 150px;',
'',
'	/* Rule 3, for the reveal below. */',
'	transform-origin: 0 100%;',
'',
'	/* The container is inert; only the blob inside it takes the click, so',
'	   the cue never blocks a scroll or a drag over the corner. */',
'	pointer-events: none;',
'}',
'',
'/* THE ARRIVAL. Re-triggered every time the attribute flips to true,',
'   which is what makes returning from the gallery an entrance rather',
'   than the blob simply being there again. Growing out of the corner it',
'   is stuck to, so arriving and leaving are the same movement reversed. */',
'.workcue[data-visible=\'true\'] {',
'	animation: wc-reveal var(--wc-show) var(--wc-show-ease) both;',
'}',
'',
'@keyframes wc-reveal {',
'	from {',
'		opacity: 0;',
'		transform: scale(0.72, 0.58);',
'	}',
'	to {',
'		opacity: 1;',
'		transform: scale(1, 1);',
'	}',
'}',
'',
'.workcue[data-visible=\'false\'] {',
'	opacity: 0;',
'	transform: scale(0.9, 0.8);',
'	transition:',
'		opacity var(--wc-hide) var(--wc-hide-ease),',
'		transform var(--wc-hide) var(--wc-hide-ease);',
'}',
'',
'/* THE GLOW. What separates the blob from black cards passing behind it.',
'   At this size it is a shadow\'s opposite, not a light source. */',
'.workcue::before {',
'	content: \'\';',
'	position: absolute;',
'	inset-block-end: -40%;',
'	inset-inline-start: -40%;',
'	width: 180%;',
'	height: 180%;',
'',
'	background: radial-gradient(',
'		50% 50% at 50% 50%,',
'		rgb(181 108 75 / 14%) 0%,',
'		rgb(181 108 75 / 5%) 45%,',
'		rgb(181 108 75 / 0%) 74%',
'	);',
'',
'	opacity: 0;',
'	transition: opacity var(--wc-show) var(--wc-show-ease);',
'	pointer-events: none;',
'}',
'',
'.workcue[data-visible=\'true\']::before {',
'	opacity: 1;',
'}',
'',
'/* THE BLOB.',
'',
'   NO backdrop-filter and no drop shadow. The colour is opaque by',
'   request (#3f3b38), so a blur behind it would cost a compositor pass',
'   on a pinned WebGL section and never be seen - and clip-path cuts',
'   everything outside the path, shadow included, so an outer shadow',
'   cannot render at all. Depth is therefore entirely inset: lit along',
'   the crest, shaded under the belly.',
'',
'   The surface is a sheen and nothing else. A noise layer was tried and',
'   removed: at full strength, overlay-blended against a dark base, the',
'   noise BECAME the colour and the blob rendered flat grey. */',
'.workcue__pill {',
'	position: absolute;',
'	inset: 0;',
'	width: 200px;',
'	height: 150px;',
'',
'	clip-path: path("' + SHAPE + '");',
'',
'	/* Label low-left, well inside the solid mass. clip-path clips',
'	   hit-testing too, so anything near the curve is unclickable. */',
'	display: flex;',
'	align-items: flex-end;',
'	justify-content: flex-start;',
'	padding: 0 0 20px 20px;',
'',
'	border: none;',
'	background-color: #3f3b38;',
'	background-image:',
'		radial-gradient(',
'			130% 110% at 22% 12%,',
'			rgb(255 255 255 / 9%) 0%,',
'			rgb(255 255 255 / 3%) 40%,',
'			rgb(0 0 0 / 0%) 70%',
'		),',
'		linear-gradient(160deg, rgb(255 255 255 / 4%) 0%, rgb(0 0 0 / 14%) 100%);',
'',
'	box-shadow:',
'		inset 0 2px 2px rgb(255 255 255 / 12%),',
'		inset -2px -3px 7px rgb(0 0 0 / 26%),',
'		inset 0 0 26px rgb(0 0 0 / 14%);',
'',
'	color: var(--color-primary, #f5f1e8);',
'	cursor: pointer;',
'	pointer-events: none;',
'',
'	/* Rules 3 and 4. */',
'	transform-origin: 0 100%;',
'	transform: scale(var(--wc-sx, 1), var(--wc-sy, 1));',
'	transition: background-color 320ms ease;',
'}',
'',
'.workcue[data-visible=\'true\'] .workcue__pill {',
'	pointer-events: auto;',
'	/* Promoted once. This is rewritten every frame during a scroll, over a',
'	   pinned WebGL section already competing for the frame budget. */',
'	will-change: transform;',
'	backface-visibility: hidden;',
'}',
'',
'/* Colour only. A hover transform would fight the spring for rule 4. */',
'.workcue[data-visible=\'true\'] .workcue__pill:hover {',
'	background-color: #4a4541;',
'}',
'',
'.workcue[data-visible=\'true\'] .workcue__pill:active {',
'	transform: scale(calc(var(--wc-sx, 1) * 1.02), calc(var(--wc-sy, 1) * 0.97));',
'}',
'',
'.workcue__pill:focus-visible {',
'	outline: 2px solid var(--color-accent, #b56c4b);',
'	outline-offset: 4px;',
'}',
'',
'.workcue__text {',
'	font-family: var(--font-ark-es), ui-monospace, monospace;',
'	font-size: clamp(9px, 0.62vw, 11px);',
'	font-weight: 700;',
'	letter-spacing: 0.16em;',
'	text-transform: uppercase;',
'	white-space: nowrap;',
'	opacity: 0.82;',
'	transition:',
'		letter-spacing 320ms ease,',
'		opacity 320ms ease;',
'}',
'',
'.workcue__pill:hover .workcue__text {',
'	letter-spacing: 0.2em;',
'	opacity: 1;',
'}',
'',
'/* path() takes absolute pixels with no percentage form, so the phone',
'   outline is the same curve retraced at 0.74 rather than scaled. */',
'@media (max-width: 640px) {',
'	.workcue {',
'		width: 148px;',
'		height: 111px;',
'		inset-block-end: max(0px, env(safe-area-inset-bottom));',
'	}',
'',
'	.workcue__pill {',
'		width: 148px;',
'		height: 111px;',
'		clip-path: path("' + SMALL + '");',
'		padding: 0 0 15px 15px;',
'	}',
'}',
'',
'@media (prefers-reduced-motion: reduce) {',
'	/* The spring never starts, so --wc-sx/--wc-sy are absent and the',
'	   fallbacks resolve to 1. */',
'	.workcue[data-visible=\'true\'] .workcue__pill {',
'		transform: none;',
'	}',
'}',
'',
''
].join('\r\n');

/* Replace the original block, which runs from `.workcue {` to the shared
   reduced-motion media query that also carries .wg rules. */
const src = readFileSync(CSS, 'utf8');

const startMark = '.workcue {\r\n\tposition: fixed;';
const endMark = '@media (prefers-reduced-motion: reduce) {\r\n\t.wg,';
const passMark = '/* ============================ JELLY CORNER PASS 2';

for (const [name, m] of [['start', startMark], ['end', endMark], ['pass2', passMark]]) {
	const hits = src.split(m).length - 1;
	if (hits !== 1) {
		console.error('FAIL consolidate: ' + name + ' matched ' + hits);
		process.exit(1);
	}
}

const a = src.indexOf(startMark);
const b = src.indexOf(endMark);
const c = src.indexOf(passMark);
if (!(a < b && b < c)) {
	console.error('FAIL consolidate: markers out of order');
	process.exit(1);
}

/* Head, new block, the shared reduced-motion + phone-close section that
   sits between, and then nothing - passes 2-6 run to EOF and all of them
   are superseded. */
const middle = src.slice(b, c);
writeFileSync(CSS, src.slice(0, a) + block + middle.trimEnd() + '\r\n', 'utf8');
console.log('ok: consolidate-passes');
applied++;

console.log('applied ' + applied + ' edits');

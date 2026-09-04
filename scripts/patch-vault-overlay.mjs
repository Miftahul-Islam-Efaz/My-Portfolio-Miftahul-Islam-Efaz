#!/usr/bin/env node
/* ------------------------------------------------------------------
   THE VAULT BECOMES AN OVERLAY, NOT A ROUTE.

   "Like the case study window - it opens instantly." It does, and the
   reason is architectural: DitherCarousel holds the open state and
   renders CaseStudyWindow directly, so the window exists on the same
   frame as the click. Nothing is fetched.

   The Vault was an intercepting route, so every open paid for a segment
   fetch (plus an on-demand compile in dev). This makes it match:

     - config/vaultWindow.ts   timings retuned to the case study's, and
                               the front-loaded quint restored. The
                               slower symmetric curve was compensation
                               for a wait that no longer exists, and it
                               made the whole thing feel heavy.
     - VaultWindow.tsx         no router. onClose is now required and
                               the flare handoff event is gone.
     - layout.tsx              the @modal parallel-route slot removed.
     - VaultTeaser.tsx         line endings normalised back to CRLF
                               after being rewritten.

   Anchored and idempotent, every anchor asserted, per-file line endings
   preserved.

     node scripts/patch-vault-overlay.mjs
   ------------------------------------------------------------------ */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const touched = [];

const load = (rel) => {
	const raw = readFileSync(resolve(root, rel), 'utf8');
	return { crlf: raw.includes('\r\n'), text: raw.replace(/\r\n/g, '\n') };
};

const save = (rel, file) => {
	writeFileSync(
		resolve(root, rel),
		file.crlf ? file.text.replace(/\n/g, '\r\n') : file.text,
		'utf8'
	);
	touched.push(rel);
};

const swap = (file, rel, find, replace) => {
	if (!file.text.includes(find)) {
		throw new Error(
			'patch-vault-overlay: anchor not found in ' +
				rel +
				'\n---\n' +
				find +
				'\n---'
		);
	}
	file.text = file.text.replace(find, replace);
};

/* ------------------------------------------------------------------
   1. THE TIMINGS.

   Two rounds of retiming to undo. The opening was easeOutExpo at
   1150ms; it was changed to easeInOutCubic at 1400ms to stop it reading
   as a snap - which was a real observation, but the snap was only
   visible BECAUSE a ~1s wait sat in front of it. Remove the wait and
   the front-loaded curve is correct again, which is exactly what the
   case study window uses.

   So these now mirror WINDOW_MOTION in config/caseStudy.ts: 700ms on
   cubic-bezier(0.22, 1, 0.36, 1). Those numbers were traced from a
   reference clip frame by frame, and the whole site already moves at
   that weight - matching them is why the two windows will finally feel
   like the same product.
   ------------------------------------------------------------------ */
{
	const rel = 'src/config/vaultWindow.ts';
	const file = load(rel);

	if (!file.text.includes('cubic-bezier(0.22, 1, 0.36, 1)')) {
		swap(
			file,
			rel,
			'\t *  than a cut; short enough that it never feels like waiting.\n' +
				'\t *\n' +
				'\t *  Raised from 1150 when the curve below stopped being\n' +
				'\t *  front-loaded. An easeOutExpo opening is effectively over long\n' +
				'\t *  before its stated duration, so 1150 was never really 1150;\n' +
				'\t *  a symmetric curve spends the whole budget, and needs a\n' +
				'\t *  slightly larger one to avoid feeling hurried through the\n' +
				'\t *  middle where it is now fastest. */\n' +
				'\topenDuration: 1400,',
			'\t *  than a cut; short enough that it never feels like waiting.\n' +
				'\t *\n' +
				'\t *  THE SAME VALUE AS WINDOW_MOTION.openDuration in\n' +
				'\t *  config/caseStudy.ts, and that is the point: this site has\n' +
				'\t *  one window vocabulary and two windows that must not feel\n' +
				'\t *  like different products.\n' +
				'\t *\n' +
				'\t *  It went 1150 -> 1400 while the window was a route, to stop\n' +
				'\t *  the opening reading as a snap. The snap was real but the\n' +
				'\t *  cause was not the curve: a ~1s segment fetch sat in front of\n' +
				'\t *  it, so the animation was the only fast thing in a slow\n' +
				'\t *  sequence. Slowing it down made every part of the interaction\n' +
				'\t *  heavy. The fetch is gone; the animation can be quick again. */\n' +
				'\topenDuration: 700,'
		);

		swap(
			file,
			rel,
			'\t/** easeInOutCubic. Gentle at both ends, fastest through the\n' +
				'\t *  middle - the mask gathers, sweeps, and settles.\n' +
				'\t *\n' +
				'\t *  THE DEFECT THIS REPLACES, because it looks like a downgrade\n' +
				'\t *  and will be "fixed" back otherwise: this was\n' +
				'\t *  cubic-bezier(0.16, 1, 0.3, 1), easeOutExpo. That curve is\n' +
				'\t *  correct for something ARRIVING, where the settle is what you\n' +
				'\t *  perceive - and it is used all over this site for exactly\n' +
				'\t *  that. It is wrong for something OPENING, where the travel IS\n' +
				'\t *  the event: it covers half the distance in the first ~7% of\n' +
				'\t *  the duration, so the window snapped open and then crawled.\n' +
				'\t *  Reported, accurately, as "instant but sharp".\n' +
				'\t *\n' +
				'\t *  Still overshoot-free, which is non-negotiable: a clip-path\n' +
				'\t *  that overshoots reveals the page edge behind it.\n' +
				'\t *\n' +
				'\t *  IF YOU CHANGE THIS, CHANGE VAULT_OPEN_SHADER.ease TOO. */\n' +
				"\topenEase: 'cubic-bezier(0.65, 0, 0.35, 1)',",
			'\t/** Quint out - the same curve as the case study window and as\n' +
				'\t *  reveal-loader.css, which is this site\'s existing vocabulary\n' +
				'\t *  for a full-screen surface arriving.\n' +
				'\t *\n' +
				'\t *  Front-loaded on purpose. A curve like this is only ever a\n' +
				'\t *  mistake when something slow happens FIRST - then the eye has\n' +
				'\t *  time to notice that the motion is already over. Opened on\n' +
				'\t *  the click frame, the same curve is what makes the window\n' +
				'\t *  feel like it was already there.\n' +
				'\t *\n' +
				'\t *  Overshoot-free, which is non-negotiable: a clip-path that\n' +
				'\t *  overshoots reveals the page edge behind it.\n' +
				'\t *\n' +
				'\t *  IF YOU CHANGE THIS, CHANGE VAULT_OPEN_SHADER.ease TOO. */\n' +
				"\topenEase: 'cubic-bezier(0.22, 1, 0.36, 1)',"
		);

		/* The close matches the case study's too. */
		swap(file, rel, '\tcloseDuration: 620,', '\tcloseDuration: 520,');
		swap(
			file,
			rel,
			"\tcloseEase: 'cubic-bezier(0.7, 0, 0.84, 0)',",
			"\tcloseEase: 'cubic-bezier(0.64, 0, 0.78, 0)',"
		);

		/* The shader solves the same curve numerically every frame. If the
		   two drift, the glowing front and the geometric mask edge travel
		   at different speeds and the eye sees both. */
		swap(
			file,
			rel,
			'\tease: [0.65, 0, 0.35, 1] as [number, number, number, number],',
			'\tease: [0.22, 1, 0.36, 1] as [number, number, number, number],'
		);

		/* THE REST OF THE CHOREOGRAPHY, pulled in proportion. Everything
		   below was scaled for a 1400ms panel; left alone against a 700ms
		   one, the photograph would still be settling and the title still
		   arriving long after the window had finished opening, which is the
		   "everything is slowed down" feeling rather than the panel itself.

		   The plate still outlasts the panel - that overlap is what stops
		   the image looking glued to the mask - but by a beat now, not by
		   most of a second. */
		swap(file, rel, '\tveilDuration: 520,', '\tveilDuration: 380,');
		swap(file, rel, '\tplateDuration: 1600,', '\tplateDuration: 900,');
		swap(file, rel, '\ttitleDuration: 900,', '\ttitleDuration: 620,');
		swap(file, rel, '\ttitleStagger: 34,', '\ttitleStagger: 26,');
		swap(file, rel, '\tmetaDuration: 700,', '\tmetaDuration: 520,');

		/* The burn front goes back to narrow-and-hot. It was widened and
		   dimmed to suit a slow front; at this speed a broad dim band just
		   reads as haze. */
		swap(file, rel, '\trimWidth: 210,', '\trimWidth: 140,');
		swap(file, rel, '\trimGain: 1.05,', '\trimGain: 1.15,');
		swap(file, rel, '\tbloomRadius: 320,', '\tbloomRadius: 280,');

		save(rel, file);
	}
}

/* ------------------------------------------------------------------
   2. THE WINDOW. No router, no handoff event.
   ------------------------------------------------------------------ */
{
	const rel = 'src/components/vault/VaultWindow.tsx';
	const file = load(rel);

	if (file.text.includes('useRouter')) {
		swap(file, rel, "import { useRouter } from 'next/navigation';\n", '');

		swap(
			file,
			rel,
			'   THE VAULT WINDOW\n' +
				'\n' +
				'   Rendered by the intercepting route app/@modal/(.)vault, so it appears\n' +
				'   OVER the landing page when you arrive from the teaser, while\n' +
				'   /vault-on-a-cold-load still renders the full standalone document.\n' +
				'   One URL, two presentations.',
			'   THE VAULT WINDOW\n' +
				'\n' +
				'   Rendered directly by VaultTeaser as a client-side overlay, so it\n' +
				'   exists on the same frame as the click, and by VaultStandalone for\n' +
				'   the real /vault document. One component, two entrances - which is\n' +
				'   why it takes onClose rather than knowing how it was opened.'
		);

		swap(
			file,
			rel,
			'   An intercepting route fixes exactly that: the landing page stays\n' +
				'   mounted underneath, scroll position intact, so closing the window is\n' +
				'   free. And it keeps the URL, which the user correctly pointed out is\n' +
				'   not in tension with being a window.',
			'   An overlay fixes exactly that: the landing page stays mounted\n' +
				'   underneath, scroll position intact, so closing the window is free.\n' +
				'\n' +
				'   THIS WAS TRIED AS AN INTERCEPTING ROUTE FIRST (app/@modal/(.)vault)\n' +
				'   and it does keep the page mounted - but a route segment still has to\n' +
				'   be fetched before it can render, which put a second between the\n' +
				'   press and the window, and two to three on the first click in dev.\n' +
				'   An overlay has nothing to fetch. The URL is kept with the History\n' +
				'   API instead, which was always the user\'s own point: a window can\n' +
				'   have a URL.'
		);

		swap(
			file,
			rel,
			'type VaultWindowProps = {\n' +
				'\t/** How the window was reached. `back()` returns to wherever the user\n' +
				'\t *  was, preserving scroll; this override is for the standalone route,\n' +
				'\t *  where there is nothing underneath to go back to. */\n' +
				'\tonClose?: () => void;\n' +
				'};',
			'type VaultWindowProps = {\n' +
				'\t/** Called at the END of the close transition, never at the start -\n' +
				'\t *  see `close` below. REQUIRED: this component has no idea how it\n' +
				'\t *  was opened, and the two callers dismiss it in completely\n' +
				'\t *  different ways (the teaser unmounts it and pops a history entry;\n' +
				'\t *  the standalone document navigates home). It used to fall back to\n' +
				'\t *  router.back() when omitted, which quietly did the wrong thing in\n' +
				'\t *  the overlay case. */\n' +
				'\tonClose: () => void;\n' +
				'};'
		);

		swap(
			file,
			rel,
			'export const VaultWindow: React.FC<VaultWindowProps> = ({ onClose }) => {\n' +
				'\tconst router = useRouter();\n\n',
			'export const VaultWindow: React.FC<VaultWindowProps> = ({ onClose }) => {\n'
		);

		swap(
			file,
			rel,
			'\t\t\tinner = requestAnimationFrame(() => {\n' +
				"\t\t\t\tsetState('open');\n" +
				'\n' +
				"\t\t\t\t/* THE HANDOFF. The teaser lit a flare at the folder's mouth\n" +
				'\t\t\t\t   on release and has been holding it while this segment\n' +
				'\t\t\t\t   loaded. Announcing it on THIS commit - the same one that\n' +
				'\t\t\t\t   starts the mask and the burst - means the flare fades out\n' +
				'\t\t\t\t   underneath light that is already growing from the same\n' +
				'\t\t\t\t   point. Handing over on a timer instead would either\n' +
				'\t\t\t\t   double the brightness for a moment or leave a gap, and\n' +
				'\t\t\t\t   both read as two separate effects rather than one.\n' +
				'\n' +
				'\t\t\t\t   A DOM event because the teaser is in another route\n' +
				'\t\t\t\t   segment: there is no shared provider, and nothing here\n' +
				'\t\t\t\t   should trigger a re-render of the page underneath. */\n' +
				"\t\t\t\twindow.dispatchEvent(new Event('vault:opened'));\n" +
				'\t\t\t});',
			"\t\t\tinner = requestAnimationFrame(() => setState('open'));"
		);

		swap(
			file,
			rel,
			'\t\twindow.setTimeout(() => {\n' +
				'\t\t\tif (onClose) onClose();\n' +
				'\t\t\telse router.back();\n' +
				'\t\t}, VAULT_WINDOW_MOTION.closeDuration);\n' +
				'\t}, [onClose, router]);',
			'\t\twindow.setTimeout(onClose, VAULT_WINDOW_MOTION.closeDuration);\n' +
				'\t}, [onClose]);'
		);

		save(rel, file);
	}
}

/* ------------------------------------------------------------------
   3. THE ROOT LAYOUT. The parallel-route slot goes.
   ------------------------------------------------------------------ */
{
	const rel = 'src/app/layout.tsx';
	const file = load(rel);

	if (file.text.includes('{modal}')) {
		swap(
			file,
			rel,
			'export default function RootLayout({\n' +
				'\tchildren,\n' +
				'\tmodal,\n' +
				'}: Readonly<{ children: React.ReactNode; modal: React.ReactNode }>) {',
			'export default function RootLayout({\n' +
				'\tchildren,\n' +
				'}: Readonly<{ children: React.ReactNode }>) {'
		);

		swap(
			file,
			rel,
			'\t\t\t\t{/* THE MODAL SLOT - a parallel route (app/@modal).\n' +
				'\n' +
				'\t\t\t\t    Normally empty. It fills in when an intercepting route matches,\n' +
				'\t\t\t\t    which today means app/@modal/(.)vault: clicking the Vault\n' +
				'\t\t\t\t    teaser renders the Vault as a WINDOW over this page instead of\n' +
				'\t\t\t\t    replacing it, while /vault still resolves to a real standalone\n' +
				'\t\t\t\t    document when it is loaded, shared or crawled directly.\n' +
				'\n' +
				'\t\t\t\t    Placed AFTER {children} and outside it, deliberately: the\n' +
				'\t\t\t\t    landing page must stay mounted underneath so its scroll\n' +
				'\t\t\t\t    position, Lenis instance and WebGL contexts survive the trip -\n' +
				'\t\t\t\t    that survival is the entire point of the window, and it is the\n' +
				'\t\t\t\t    return journey it pays for.\n' +
				'\n' +
				'\t\t\t\t    app/@modal/default.tsx must exist alongside this or every hard\n' +
				'\t\t\t\t    navigation 404s on the unmatched slot. */}\n' +
				'\t\t\t\t{modal}\n',
			'\t\t\t\t{/* NO MODAL SLOT, deliberately.\n' +
				'\n' +
				'\t\t\t\t    The Vault used to render here through a parallel route\n' +
				'\t\t\t\t    (app/@modal + app/@modal/(.)vault). It is now a client-side\n' +
				'\t\t\t\t    overlay owned by the Vault teaser, because a route segment\n' +
				'\t\t\t\t    cannot be rendered without first being fetched, and the click\n' +
				'\t\t\t\t    has to be instant - see the note in\n' +
				'\t\t\t\t    components/vault/VaultTeaser.tsx.\n' +
				'\n' +
				'\t\t\t\t    /vault still exists as a real standalone document for direct\n' +
				'\t\t\t\t    loads, shares and crawlers; the overlay keeps the URL in step\n' +
				'\t\t\t\t    with the History API.\n' +
				'\n' +
				'\t\t\t\t    If a slot is ever reintroduced here, app/@modal/default.tsx\n' +
				'\t\t\t\t    has to come back with it or every hard navigation 404s on the\n' +
				'\t\t\t\t    unmatched slot. */}\n'
		);

		save(rel, file);
	}
}

/* ------------------------------------------------------------------
   4. VaultTeaser.tsx was rewritten wholesale and came back with LF
      endings. The rest of the file was CRLF, and a whole-file ending
      flip turns a real diff into an unreadable one.
   ------------------------------------------------------------------ */
{
	const rel = 'src/components/vault/VaultTeaser.tsx';
	const path = resolve(root, rel);
	const raw = readFileSync(path, 'utf8');
	if (!raw.includes('\r\n')) {
		writeFileSync(path, raw.replace(/\n/g, '\r\n'), 'utf8');
		touched.push(rel + ' (CRLF)');
	}
}

if (touched.length === 0) {
	console.log('patch-vault-overlay: already applied, nothing to do');
} else {
	for (const rel of touched) {
		console.log('patch-vault-overlay: patched ' + rel);
	}
}
